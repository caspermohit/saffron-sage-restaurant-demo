<?php

namespace Database\Seeders;

use App\Models\DiningTable;
use App\Models\MenuItem;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = config('restaurant.staff_password');
        if (! $password || strlen($password) < 12) {
            throw new \RuntimeException('Set STAFF_PASSWORD to at least 12 characters before seeding.');
        }
        User::firstOrCreate(['email' => config('restaurant.staff_email')], ['name' => 'Alex Morgan', 'password' => Hash::make($password)]);
        foreach (range(1, 12) as $n) {
            DiningTable::firstOrCreate(['name' => sprintf('Table %02d', $n)], ['zone' => $n <= 8 ? 'Main dining' : 'Terrace', 'seats' => in_array($n, [3, 6, 9]) ? 6 : ($n % 4 === 0 ? 2 : 4), 'qr_token' => Str::random(48)]);
        }
        $items = [
            ['Tomato & basil fusilli', 'Starters', 'Fusilli pasta, slow-roasted tomato sauce, fresh basil and grated parmesan.', 1450, ['Gluten', 'Milk'], 0, 'photo-1608897013039-887f21d8c804'],
            ['Chargrilled chicken skewers', 'Starters', 'Smoky chicken skewers, fresh herbs, charred lemon and house garlic yoghurt.', 1600, ['Milk'], 0, 'photo-1599487488170-d11ec9c172f0'],
            ['Basil pesto farfalle', 'Mains', 'Farfalle pasta, basil pesto, cherry tomatoes, pine nuts and parmesan.', 2450, ['Gluten', 'Milk', 'Nuts'], 0, 'photo-1473093295043-cdd812d0e601'],
            ['Wood-fired margherita', 'Mains', 'San Marzano tomatoes, fior di latte, basil and extra virgin olive oil.', 2100, ['Gluten', 'Milk'], 0, 'photo-1579751626657-72bc17010498'],
            ['Harissa roasted chicken', 'Mains', 'Flame-roasted chicken, warm couscous, charred lemon and herb yoghurt.', 2800, ['Gluten', 'Milk'], 2, 'photo-1532550907401-a500c9a57435'],
            ['Garden harvest bowl', 'Mains', 'Roasted seasonal vegetables, quinoa, avocado and a lemon tahini dressing.', 1950, ['Sesame'], 0, 'photo-1512621776951-a57141f2eefd'],
            ['Pistachio tiramisu', 'Desserts', 'Espresso-soaked sponge, pistachio mascarpone and cocoa.', 1150, ['Gluten', 'Milk', 'Nuts', 'Eggs'], 0, 'photo-1571877227200-a0d98ea607e9'],
            ['House lemonade', 'Drinks', 'Freshly squeezed lemon, a touch of honey and sparkling water.', 650, [], 0, 'photo-1513558161293-cdaf765edfd7'],
            ['Rosemary spritz', 'Drinks', 'Blood orange, rosemary and soda. Bright, botanical and alcohol-free.', 850, [], 0, 'photo-1513558161293-cdaf765edfd7'],
        ];
        foreach ($items as [$name,$category,$description,$price,$allergens,$spice,$photo]) {
            MenuItem::firstOrCreate(['name' => $name], ['category' => $category, 'description' => $description, 'price' => $price, 'allergens' => $allergens, 'spice' => $spice, 'image' => 'https://images.unsplash.com/'.$photo.'?auto=format&fit=crop&w=700&q=80']);
        }
    }
}
