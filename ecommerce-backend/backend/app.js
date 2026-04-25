require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./config/db');

// Import Middlewares
const { errorHandler } = require('./middlewares/error');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const storefrontRoutes = require('./routes/storefrontRoutes');
const publicRoutes = require('./routes/publicRoutes');
const inventory = require('./routes/inventory');


// 1. Initialize Database
connectDB();

const app = express();

// 2. Global Middlewares
app.use(express.json()); // Parses incoming JSON requests
app.use(cookieParser()); // Parses cookies so we can read the JWT

// Configure CORS
// In production, replace '*' with your actual domains for security
app.use(cors({
    origin: [
        'http://localhost:3000', // Next.js Storefront
        'http://localhost:5173', // React Admin (Vite)
        /\.localhost:3000$/      // Allows all subdomains on localhost
    ],
    credentials: true // Crucial: Allows cookies to be sent back and forth
}));

// 3. Mount Routes
app.use('/api/auth', authRoutes);           // Registration, Login, Logout
app.use('/api/admin', adminRoutes);         // Product & Staff management (Protected)
app.use('/api/storefront', storefrontRoutes); // Public Storefront data (Subdomain-based)
app.use('/api/public', publicRoutes);
app.use('/api/admin/inventory', inventory);
// 4. Base Health Check Route
app.get('/', (req, res) => {
    res.send('API is running successfully...');
});

// 5. Global Error Handler (MUST be the last middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});