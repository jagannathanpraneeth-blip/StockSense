// Runs production API handlers against a fresh temporary database, never dev.db.
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const root = path.resolve(__dirname, '..');
const dir = mkdtempSync(path.join(tmpdir(), 'stocksense-review-'));
const dbUrl = 'file:' + path.join(dir, 'test.db').replace(/\\/g, '/');
let server, smtp, prisma, port, output = '', passed = 0;
const baseEnv = { ...process.env, NODE_ENV: 'test', DATABASE_URL: dbUrl, SESSION_DB_DIR: dir, SESSION_SECRET: 'isolated-test-session-secret-at-least-32-characters', LOCAL_OTP_LOG: 'false', SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '' };
function check(value, name) { if (!value) throw new Error(name); passed++; console.log(`PASS ${passed}: ${name}`); }
async function start(extra = {}) {
  server = spawn(process.execPath, ['dist/server.js'], { cwd: root, env: { ...baseEnv, PORT: String(port), CORS_ORIGIN: `http://localhost:${port}`, ...extra }, stdio: ['ignore','pipe','pipe'] });
  server.stdout.on('data', d => output += d); server.stderr.on('data', d => output += d);
  for (let i=0;i<100;i++) { try { const r=await fetch(`http://localhost:${port}/api/health`); if(r.ok) return; } catch {} await new Promise(r => setTimeout(r,100)); }
  throw new Error('Server did not start: '+output);
}
async function stop() { if(server && server.exitCode === null && server.signalCode === null) { const exited = once(server, 'exit'); server.kill('SIGKILL'); await exited; } }
async function api(method, route, body, cookie='', expected=200, extra={}) {
  const res = await fetch(`http://localhost:${port}/api${route}`, { method, headers: { 'Content-Type':'application/json', ...(cookie ? {cookie}:{}), ...extra }, ...(body!==undefined ? {body:JSON.stringify(body)}:{}) });
  const json = await res.json();
  if(expected !== null && res.status !== expected) throw new Error(`${method} ${route}: expected ${expected}, got ${res.status}: ${JSON.stringify(json)}`);
  return { setCookie:res.headers.get('set-cookie') || '', status:res.status, data:json.data, json, cookie:res.headers.get('set-cookie')?.split(';')[0] || '' };
}
async function main() {
  const listener=net.createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');port=listener.address().port;await new Promise(r=>listener.close(r));
  writeFileSync(path.join(dir, 'test.db'), '');
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'),'migrate','deploy'], {cwd:root,env:baseEnv,stdio:'pipe'});
  prisma=new PrismaClient({datasources:{db:{url:dbUrl}}});
  const manager=await prisma.user.create({data:{name:'Test Manager',email:'manager@test.invalid',role:'INVENTORY_MANAGER',passwordHash:await bcrypt.hash('Manager-Test-123!',10)}});
  await start();
  await api('GET','/products',undefined,'',401);check(true,'Unauthenticated business API rejected');
  const managerLogin=await api('POST','/auth/login',{email:manager.email,password:'Manager-Test-123!'});const mc=managerLogin.cookie;
  check(!!mc,'Manager login returns a session cookie');
  const signup=await api('POST','/auth/signup',{name:'Test Staff',email:'staff@test.invalid',password:'Staff-Test-123!',role:'ADMIN'},'',201);const sc=signup.cookie;
  check(signup.data.role==='WAREHOUSE_STAFF','Signup cannot self-assign privileged role');
  await api('POST','/categories',{name:'Forged'},mc,403,{Origin:'https://evil.invalid'});check(true,'Cross-origin authenticated write rejected');
  const cat=(await api('POST','/categories',{name:'Review Category'},mc,201)).data;
  const otherCat=(await api('POST','/categories',{name:'Other Category'},mc,201)).data;
  const warehouse=(await api('POST','/warehouses',{name:'Review Warehouse',code:'REV'},mc,201)).data;
  const emptyWarehouse=(await api('POST','/warehouses',{name:'Empty Warehouse',code:'EMPTY'},mc,201)).data;
  const loc=async code=>(await api('POST','/locations',{name:code,code,warehouseId:warehouse.id},mc,201)).data;
  const a=await loc('A'),b=await loc('B');
  const prod=async(sku,qty=0,cookie=mc)=>(await api('POST','/products',{name:sku,sku,categoryId:cat.id,uom:'kg',reorderThreshold:10,initialStock:qty,initialLocationId:a.id},cookie,201)).data;
  const p=await prod('FLOW');const q=await prod('EMPTY');
  await api('POST','/products',{name:'dup',sku:'FLOW',categoryId:cat.id},mc,409);check(true,'Duplicate SKU rejected');
  const product=async id=>(await api('GET','/products/'+id,undefined,mc)).data;
  const bal=async(id,l)=>(await product(id)).stockBalances.find(x=>x.locationId===l.id)?.quantity||0;
  const receipt=async(id,qty,location=a)=>(await api('POST','/receipts',{partner:'Vendor',destLocationId:location.id,lines:[{productId:id,demandQty:qty,doneQty:qty}]},mc,201)).data;
  const validate=async(type,op,cookie=mc,expected=200)=>api('POST',`/${type}/${op.id}/validate`,{version:op.version},cookie,expected);
  let rec=await receipt(p.id,100);
  check(await bal(p.id,a)===0,'Receipt draft leaves stock unchanged');
  await validate('receipts',rec,sc,403);check(true,'Staff receipt validation rejected');
  await validate('receipts',rec);
  check(await bal(p.id,a)===100 && await bal(p.id,b)===0,'Receive 100: A=100, B=0');
  await validate('receipts',rec,mc,409);check(await bal(p.id,a)===100,'Repeated validation does not add stock');
  const tr=(await api('POST','/transfers',{sourceLocationId:a.id,destLocationId:b.id,expectedDate:'2026-09-27',lines:[{productId:p.id,demandQty:30}]},mc,201)).data;
  await validate('transfers',tr);check(await bal(p.id,a)===70 && await bal(p.id,b)===30,'Transfer 30: A=70, B=30, total=100');
  async function delivery(lines,location=b) {
    let op=(await api('POST','/deliveries',{partner:'Customer',sourceLocationId:location.id,lines},mc,201)).data;
    op=(await api('POST',`/deliveries/${op.id}/start-picking`,{},mc)).data;
    return (await api('POST',`/deliveries/${op.id}/mark-ready`,{},mc)).data;
  }
  const d=await delivery([{productId:p.id,demandQty:20,doneQty:20}]);await validate('deliveries',d);
  check(await bal(p.id,a)===70 && await bal(p.id,b)===10,'Deliver 20: A=70, B=10');
  const adjust=async(id,count,location=b)=>(await api('POST','/adjustments',{productId:id,locationId:location.id,countedQty:count,reason:'Physical cycle count'},mc,201)).data;
  const adj=await adjust(p.id,8);await validate('adjustments',adj);
  check(await bal(p.id,a)===70 && await bal(p.id,b)===8,'Count 8: A=70, B=8, total=78');
  const ledger=await prisma.stockLedger.findMany({where:{productId:p.id}});
  check(ledger.length===5 && ledger.filter(x=>x.locationId===a.id).reduce((s,x)=>s+x.deltaQty,0)===70 && ledger.filter(x=>x.locationId===b.id).reduce((s,x)=>s+x.deltaQty,0)===8,'Five actual API-generated ledger entries reconcile to balances');
  const concurrent=await receipt(q.id,10);const results=await Promise.all([validate('receipts',concurrent,mc,null),validate('receipts',concurrent,mc,null)]);
  check(results.filter(x=>x.status===200).length===1 && await bal(q.id,a)===10,'Simultaneous validation applies exactly once');
  const d1=await delivery([{productId:q.id,demandQty:7,doneQty:7}],a),d2=await delivery([{productId:q.id,demandQty:7,doneQty:7}],a);
  const outs=await Promise.all([validate('deliveries',d1,mc,null),validate('deliveries',d2,mc,null)]);
  check(outs.filter(x=>x.status===200).length===1 && await bal(q.id,a)===3,'Competing deliveries cannot overdraw stock');
  const bad=await delivery([{productId:p.id,demandQty:1,doneQty:1},{productId:q.id,demandQty:999,doneQty:999}],a);
  const beforeLedger=await prisma.stockLedger.count();await validate('deliveries',bad,mc,400);
  check(await bal(p.id,a)===70 && await prisma.stockLedger.count()===beforeLedger,'Multi-line rejection leaves all balances and ledger unchanged');
  const stale=await adjust(p.id,9);const r1=await receipt(p.id,1,b);await validate('receipts',r1);const out=await delivery([{productId:p.id,demandQty:1,doneQty:1}]);await validate('deliveries',out);
  await validate('adjustments',stale,mc,409);check(await bal(p.id,b)===8,'Stale count rejected even after balance returns to its original quantity');
  const f=await prod('FRACTION');for(const qty of [0.1,0.2]) await validate('receipts',await receipt(f.id,qty));
  check(await bal(f.id,a)===0.3,'Fractional receipts 0.1 + 0.2 produce 0.3');
  await api('POST','/receipts',{partner:'Vendor',destLocationId:a.id,lines:[{productId:f.id,demandQty:0.00001}]},mc,422);check(true,'Excess precision rejected');
  await api('POST','/transfers',{sourceLocationId:a.id,destLocationId:a.id,lines:[{productId:p.id,demandQty:1}]},mc,400);check(true,'Same-location transfer rejected');
  const canceled=await receipt(p.id,9);await api('POST',`/receipts/${canceled.id}/cancel`,{},mc);await validate('receipts',{...canceled,version:canceled.version+1},mc,400);check(await bal(p.id,a)===70,'Canceled receipt cannot change stock');
  await api('PUT',`/receipts/${rec.id}`,{partner:'Edited',version:2},mc,400);check(true,'Completed receipt cannot be edited');
  const opened=await prod('OPENING',2);check(await bal(opened.id,a)===2 && await prisma.stockLedger.count({where:{productId:opened.id}})===1,'Opening stock is audited');
  await api('POST','/products',{name:'Staff opening',sku:'STAFF-OPEN',categoryId:cat.id,initialStock:1,initialLocationId:a.id},sc,403);check(true,'Staff cannot create nonzero opening stock');
  const dash=(await api('GET',`/dashboard?warehouseId=${emptyWarehouse.id}`,undefined,mc)).data;check(dash.operations.receipts.total===0 && dash.ledgerMoves===0,'Empty-warehouse filter returns zero movements');
  const catDash=(await api('GET',`/dashboard?categoryId=${otherCat.id}`,undefined,mc)).data;check(catDash.operations.receipts.total===0,'Category filter also filters operation counts');
  const filtered=(await api('GET','/dashboard?type=RECEIPT&status=DONE',undefined,mc)).data;
  check(filtered.filteredOperations.every(x=>x.type==='RECEIPT' && x.status==='DONE') && filtered.operations.deliveries.total===0,'Document type and status filters apply');
  const pageOne=await api('GET','/ledger?limit=2&offset=0',undefined,mc);
  const pageTwo=await api('GET','/ledger?limit=2&offset=2',undefined,mc);
  check(pageOne.data.length===2 && pageOne.json.meta.hasMore && pageTwo.data.every(x=>!pageOne.data.some(y=>y.id===x.id)), 'Ledger pages contain distinct ordered records and totals');
  await api('GET','/ledger?dateFrom=bad-date',undefined,mc,422);check(true,'Invalid ledger dates rejected');
  await api('POST','/receipts',{partner:'Vendor',destLocationId:a.id,expectedDate:'bad-date',lines:[{productId:p.id,demandQty:1}]},mc,422);check(true,'Invalid scheduled date rejected');
  await api('PUT',`/deliveries/${bad.id}/lines/${bad.lines[0].id}`,{doneQty:2},mc,400);check(true,'Packed delivery quantities cannot be edited');
  await prisma.product.update({where:{id:f.id},data:{isActive:false}});
  await api('POST','/receipts',{partner:'Vendor',destLocationId:a.id,lines:[{productId:f.id,demandQty:1}]},mc,422);check(true,'Inactive product cannot be used in a new receipt');
  await api('POST','/auth/reset-password/request',{email:manager.email},'',503);check(true,'Unconfigured reset email reports configuration error');
  // Known OTP inserted only into isolated test DB; exercise actual reset handlers.
  const staff=await prisma.user.findUnique({where:{email:'staff@test.invalid'}});
  const hash=await bcrypt.hash('123456',10);
  await prisma.otpRequest.create({data:{userId:staff.id,otpHash:hash,expiresAt:new Date(Date.now()-1000)}});
  await api('POST','/auth/reset-password/verify',{email:staff.email,otp:'123456'},'',400);check(true,'Expired OTP rejected');
  await prisma.otpRequest.updateMany({where:{userId:staff.id},data:{usedAt:new Date()}});
  const otp=await prisma.otpRequest.create({data:{userId:staff.id,otpHash:hash,expiresAt:new Date(Date.now()+60000)}});
  await api('POST','/auth/reset-password/verify',{email:staff.email,otp:'000000'},'',401);
  check((await prisma.otpRequest.findUnique({where:{id:otp.id}})).attempts===1,'Wrong OTP consumes an attempt');
  await api('POST','/auth/reset-password/verify',{email:staff.email,otp:'123456'});
  const resetBody={email:staff.email,otp:'123456',newPassword:'Changed-Staff-123!'};
  const resets=await Promise.all([api('POST','/auth/reset-password/reset',resetBody,'',null),api('POST','/auth/reset-password/reset',resetBody,'',null)]);
  check(resets.filter(x=>x.status===200).length===1,'Concurrent password reset consumes OTP once');
  await api('GET','/auth/me',undefined,sc,401);check(true,'Password reset invalidates the old session');
  await stop();await start();check(await bal(p.id,a)===70 && await bal(p.id,b)===8,'Inventory and manager session persist after backend restart');
  await api('POST','/auth/logout',{},mc);await api('GET','/products',undefined,mc,401);check(true,'Logout invalidates session');
  const html=await fetch(`http://localhost:${port}/products`);check(html.ok && (await html.text()).includes('id="root"'),'Production frontend serves client-side routes');
  await api('GET','/does-not-exist',undefined,'',404);check(true,'Unknown API route returns JSON 404');
  const ui = spawn(process.execPath, ['--import','tsx',path.join(root,'../frontend/scripts/test-ui.mts')], {cwd:path.join(root,'../frontend'),env:{...process.env,TEST_BASE_URL:`http://localhost:${port}`},stdio:'inherit'});
  const [uiCode] = await once(ui,'exit');check(uiCode===0,'React DOM interactions against the real API');
  // Exercise the actual Nodemailer SMTP path using an isolated local capture server.
  let mail = '';
  smtp = net.createServer(socket => {
    socket.setEncoding('utf8'); socket.write('220 local-test ESMTP\r\n');
    let buffer='', dataMode=false;
    socket.on('data', chunk => {
      buffer += chunk;
      while(buffer.includes('\r\n')) {
        const index=buffer.indexOf('\r\n');const line=buffer.slice(0,index);buffer=buffer.slice(index+2);
        if(dataMode) { if(line==='.') {dataMode=false;socket.write('250 queued\r\n');} else mail+=line+'\n'; }
        else if(/^EHLO|^HELO/.test(line)) socket.write('250 local-test\r\n');
        else if(/^DATA/.test(line)) {dataMode=true;socket.write('354 continue\r\n');}
        else if(/^QUIT/.test(line)) socket.end('221 bye\r\n');
        else socket.write('250 ok\r\n');
      }
    });
  });
  smtp.listen(0,'127.0.0.1');await once(smtp,'listening');
  await stop();await start({SMTP_HOST:'127.0.0.1',SMTP_PORT:String(smtp.address().port)});
  await api('POST','/auth/reset-password/request',{email:manager.email});
  const captured=mail.match(/Your OTP is: (\d{6})/);
  check(!!captured,'Reset request delivers a code through the real SMTP adapter to a local capture server');
  await api('POST','/auth/reset-password/verify',{email:manager.email,otp:captured[1]});check(true,'SMTP-delivered code is accepted by the verification route');
  await stop();await start({NODE_ENV:'production',CORS_ORIGIN:'https://stocksense.example',TRUST_PROXY_HOPS:'1'});
  const prodLogin=await api('POST','/auth/login',{email:manager.email,password:'Manager-Test-123!'},'',200,{'X-Forwarded-Proto':'https',Origin:'https://stocksense.example'});
  check(/HttpOnly/.test(prodLogin.setCookie) && /Secure/.test(prodLogin.setCookie) && /SameSite=Lax/.test(prodLogin.setCookie),'Production login issues HttpOnly, Secure, SameSite=Lax cookies behind the configured proxy');
  await api('GET','/products',undefined,prodLogin.cookie);check(true,'Production session accesses persisted inventory');
  console.log(`RESULT: ${passed} passed, 0 failed. Visual browser layout and external SMTP delivery not tested here.`);
}
const watchdog = setTimeout(() => { console.error('Test suite timed out'); if(server)server.kill('SIGKILL'); process.exit(1); }, 120000);
main().catch(e=>{console.error('FAIL:',e.message);console.error(output.slice(-1800));process.exitCode=1;}).finally(async()=>{await stop();if(smtp)await new Promise(r=>smtp.close(r));if(prisma)await prisma.$disconnect();rmSync(dir,{recursive:true,force:true});clearTimeout(watchdog);});
