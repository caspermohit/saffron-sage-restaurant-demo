<?php

return [
    'demo_mode' => (bool) env('RESTAURANT_DEMO_MODE', false),
    'name' => env('RESTAURANT_NAME', 'Saffron & Sage'), 'currency' => env('RESTAURANT_CURRENCY', 'CAD'),
    'tax_percent' => (int) env('RESTAURANT_TAX_PERCENT', 13),
    'wifi_name' => env('RESTAURANT_WIFI_NAME', 'Saffron Guest'), 'wifi_password' => env('RESTAURANT_WIFI_PASSWORD', ''),
    'bank_instructions' => env('RESTAURANT_BANK_INSTRUCTIONS', 'Ask your server for bank transfer details.'),
    'staff_email' => env('STAFF_EMAIL', 'manager@saffron.local'), 'staff_password' => env('STAFF_PASSWORD'),
];
