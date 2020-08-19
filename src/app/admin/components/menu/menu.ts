import { Menu } from './menu.model'; 

export const menuItems = [ 
    new Menu (10, 'Dashboard', '/admin', null, 'dashboard', null, false, 0),
    new Menu (20, 'Products', null, null, 'grid_on', null, true, 0),  
    new Menu (21, 'Categories', '/admin/products/categories', null, 'category', null, false, 20), 
    new Menu (22, 'Products List', '/admin/products/product-list', null, 'list', null, false, 20), 
    new Menu (23, 'Product Detail', '/admin/products/product-detail', null, 'remove_red_eye', null, false, 20),  
    new Menu (24, 'Add Product', '/admin/products/add-product', null, 'add_circle_outline', null, false, 20), 
    new Menu (30, 'Sales', null, null, 'monetization_on', null, true, 0),  
    new Menu (31, 'Orders', '/admin/sales/orders', null, 'list_alt', null, false, 30), 
    new Menu (32, 'Transactions', '/admin/sales/transactions', null, 'local_atm', null, false, 30),  
    new Menu (40, 'Users', '/admin/users', null, 'group_add', null, false, 0),  
    new Menu (50, 'Customers', '/admin/customers', null, 'supervisor_account', null, false, 0),  
    new Menu (60, 'Coupons', '/admin/coupons', null, 'card_giftcard', null, false, 0),  
    new Menu (70, 'Withdrawal', '/admin/withdrawal', null, 'credit_card', null, false, 0), 
    new Menu (80, 'Analytics', '/admin/analytics', null, 'multiline_chart', null, false, 0), 
    new Menu (90, 'Refund', '/admin/refund', null, 'restore', null, false, 0),  
    new Menu (100, 'Followers', '/admin/followers', null, 'follow_the_signs', null, false, 0), 
    new Menu (110, 'Support', '/admin/support', null, 'support', null, false, 0), 
    new Menu (120, 'Reviews', '/admin/reviews', null, 'insert_comment', null, false, 0), 
    new Menu (140, 'Level 1', null, null, 'more_horiz', null, true, 0),
    new Menu (141, 'Level 2', null, null, 'folder_open', null, true, 140),
    new Menu (142, 'Level 3', null, null, 'folder_open', null, true, 141),
    new Menu (143, 'Level 4', null, null, 'folder_open', null, true, 142),
    new Menu (144, 'Level 5', null, 'http://themeseason.com', 'link', null, false, 143),
    new Menu (200, 'External Link', null, 'http://themeseason.com', 'open_in_new', '_blank', false, 0)
]