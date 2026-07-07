// seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const { MenuItem, RestaurantInfo } = require('./models');

async function seedDatabase() {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 2. Clear existing data (so we don't get duplicates)
    await MenuItem.deleteMany({});
    await RestaurantInfo.deleteMany({});
    console.log('🗑️ Cleared existing data');

    // 3. Insert Menu Items
    const menuItems = [
      { name: 'Creamy Alfredo Pasta', description: 'Rich and creamy pasta with parmesan and grilled chicken.', price: 14.99, category: 'Main', allergens: ['dairy', 'gluten'] },
      { name: 'Avocado Power Bowl', description: 'Healthy bowl with quinoa, avocado, veggies & lemon dressing.', price: 13.99, category: 'Main', allergens: [] },
      { name: 'Grilled Salmon', description: 'Perfectly grilled salmon with garlic butter and roasted veggies.', price: 18.99, category: 'Main', allergens: ['fish', 'dairy'] },
      { name: 'Choco Lava Cake', description: 'Warm chocolate cake with a rich, gooey center.', price: 8.99, category: 'Dessert', allergens: ['dairy', 'gluten'] },
      { name: 'Fresh Lemonade', description: 'House-made lemonade with fresh mint.', price: 4.99, category: 'Drink', allergens: [] }
    ];
    await MenuItem.insertMany(menuItems);

    // 4. Insert Restaurant Info (The AI's rulebook)
    const info = [
      { key: 'opening_hours', value: 'Monday-Sunday: 11:00 AM - 10:00 PM' },
      { key: 'location', value: '123 Foodie Lane,Lusaka , Lusaka city' },
      { key: 'delivery_time', value: '30-45 minutes' },
      { key: 'minimum_order', value: '$15.00' }
    ];
    await RestaurantInfo.insertMany(info);

    console.log('🌱 Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();