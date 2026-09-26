import React from 'react';
import { render, screen, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
const user = userEvent.setup();
const assert = (condition, message) => { if (!condition) throw new Error(message); console.log('UI PASS: ' + message); };
try {
  render(<App />);
  await user.type(await screen.findByPlaceholderText('name@company.com'), 'manager@test.invalid');
  await user.type(screen.getByPlaceholderText('••••••••'), 'Manager-Test-123!');
  await user.click(screen.getByRole('button', {name: 'Sign In to Workspace'}));
  const sidebar = within(await screen.findByRole('complementary'));
  const dashboard = sidebar.getByRole('button', {name: 'Dashboard'});
  await waitFor(() => { if(dashboard.getAttribute('aria-current') !== 'page') throw new Error('Dashboard not active'); });
  assert(true, 'Login opens Dashboard');
  for (const name of ['Products & Stock','Incoming Receipts','Delivery Orders','Internal Transfers','Adjustments','Move History','Warehouse Settings']) assert(!!sidebar.getByRole('button',{name}), 'Sidebar: '+name);
  await user.click(sidebar.getByRole('button',{name:'Products & Stock'}));
  const search = await screen.findByPlaceholderText('Search by product name or SKU code...');
  await user.type(search,'FLOW');
  await waitFor(() => { if(screen.getAllByTitle('View stock per location').length !== 1) throw new Error('Search pending'); });
  assert(screen.getAllByRole('columnheader').length >= 5, 'Products table loads and search filters');
  await user.click(screen.getByTitle('View stock per location'));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByText('Stock Availability per Warehouse Location');
  assert(dialog.textContent.includes('70') && dialog.textContent.includes('8'), 'Product dialog shows live location balances A=70, B=8');
  await user.click(within(dialog).getByRole('button',{name:'Close dialog'}));
  await waitFor(() => { if(screen.queryByRole('dialog')) throw new Error('Dialog still open'); });
  assert(true,'Product dialog closes');
  await user.click(sidebar.getByRole('button',{name:'Warehouse Settings'}));
  await screen.findAllByText('Review Warehouse');
  assert(!!screen.getByRole('button',{name:/Warehouses \(/}), 'Warehouses tab loads');
  await user.click(screen.getByRole('button',{name:/Locations \(/}));
  await screen.findAllByText('A');
  assert(true,'Locations tab loads');
  await user.click(sidebar.getByRole('button',{name:'Move History'}));
  await screen.findByText(/matching records/);
  await waitFor(() => { if(screen.getAllByRole('row').length < 2) throw new Error('Ledger not loaded'); });
  assert(!!screen.getByRole('button',{name:'Next page'}), 'Movement history loads with pagination');
  for(const name of ['Incoming Receipts','Delivery Orders','Internal Transfers','Adjustments']) {
    await user.click(sidebar.getByRole('button',{name}));
    await waitFor(() => { if(screen.queryByText(/Loading.*\.\.\./)) throw new Error('Still loading'); });
    assert(sidebar.getByRole('button',{name}).getAttribute('aria-current')==='page','Operation navigation: '+name);
  }
} finally { cleanup(); }
