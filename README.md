# 🚗 Car Rental System

A modern, full-stack car rental management system built with the MERN stack (MongoDB, Express.js, React, Node.js). This comprehensive system provides enterprise-grade features for both customers and administrators to manage vehicle rentals efficiently.

> **Academic Project**: This system is developed as a capstone thesis project, demonstrating full-stack development skills, modern web technologies, and professional software engineering practices.

## ✨ Features

### 👥 Customer Features

#### 🔐 Authentication & Profile
- **Secure Authentication**: JWT-based signup/login with email verification
- **Password Reset**: Email-based password recovery system
- **Profile Management**: Update personal information and profile pictures
- **Notification Settings**: Granular control over in-app and email notifications

#### 🚙 Vehicle Browsing & Booking
- **Advanced Car Catalog**: Browse vehicles with detailed specifications, images, and availability
- **Smart Booking System**: 
  - Date selection with availability checking
  - Location specification for delivery
  - Real-time price calculation
  - Operating hours enforcement (8 AM - 5 PM)
  - Time-based booking restrictions (after 5 PM, next-day bookings only)
- **Booking Management**: View, track, and manage all bookings
- **Booking Cancellation**: Cancel bookings with automatic refund calculation

#### 💳 Payment System
- **Multiple Payment Methods**:
  - GCash (with QR code and proof upload)
  - PayMaya (with QR code and proof upload)
  - Cash on Pickup
- **Payment Proof Upload**: Secure image upload with 60-second timeout handling
- **Payment Tracking**: Real-time payment status updates
- **Refund System**: Automatic refund calculation based on cancellation timing
  - 100% refund: 24+ hours before pickup
  - 50% refund: 12-24 hours before pickup
  - 0% refund: Less than 12 hours before pickup

#### 🔔 Notifications
- **Real-time In-app Notifications**: Instant updates for all booking activities
- **Email Notifications**: Professional emails via SendGrid API
- **Notification Types**:
  - Booking confirmations and updates
  - Payment verification/rejection
  - Rental checkout and completion
  - Overdue alerts
  - Refund processing
- **Customizable Preferences**: Control which notifications you receive

### 🔧 Admin Features

#### 📊 Dashboard & Analytics
- **Comprehensive Dashboard**: Real-time overview of business metrics
- **Key Metrics Tracking**:
  - Overdue rentals with priority alerts
  - Pending booking approvals
  - Payment verification queue
  - Today's checkouts and returns
  - Cars in maintenance
- **Alert System**: Priority-based alerts for critical actions
- **Revenue Analytics**: Track income, bookings, and performance

#### 🚗 Fleet Management
- **Vehicle Inventory**: Complete CRUD operations for car management
- **Detailed Car Profiles**:
  - Multiple images with gallery view
  - Comprehensive specifications (make, model, year, etc.)
  - Features and amenities
  - Pricing and availability
- **Automatic Maintenance System**: 
  - Smart car availability management based on maintenance schedule
  - Automatic status updates (available ↔ maintenance)
  - Daily scheduler checks for scheduled maintenance
  - Admin notifications when maintenance starts/completes
  - Zero manual intervention required
- **Maintenance Tracking**: Monitor service schedules and vehicle status
- **Form Validation**: Comprehensive client-side validation for all car data

#### 📋 Booking & Rental Management
- **Booking Approval System**: Review and approve/reject customer bookings
- **Rental Lifecycle Management**:
  - Checkout process
  - Active rental tracking
  - Return processing
  - Completion with late fee calculation
- **Overdue Detection**: Automatic hourly checks for overdue rentals
- **Late Fee System**: Automatic calculation (20% of daily rate per overdue day)

#### 💰 Payment & Refund Management
- **Payment Verification**: Review payment proofs and verify/reject payments
- **Payment Methods Configuration**: 
  - Enable/disable payment methods
  - Upload QR codes for GCash/PayMaya
  - Set account details
  - Validation to ensure at least one method is always enabled
- **Refund Management**:
  - View pending and processed refunds
  - Process refunds with admin notes
  - Automatic refund calculation based on cancellation policy
  - Refund tracking and history

#### 👥 User Management
- **Customer Accounts**: View and manage all user accounts
- **User Activity Tracking**: Monitor booking and rental history
- **Account Management**: Enable/disable user accounts

#### 🔔 Notification Management
- **Bulk Notifications**: Send notifications to all users or specific groups
- **Notification Templates**: Pre-defined templates for common scenarios
- **Delivery Tracking**: Monitor notification delivery status

## 🛠️ Tech Stack

### Frontend
- **React 18**: Modern UI library with hooks and functional components
- **Material-UI (MUI) v5**: Comprehensive component library for beautiful, responsive UI
- **React Router v6**: Client-side routing and navigation
- **Axios**: HTTP client for API requests with interceptors
- **Socket.io Client**: Real-time bidirectional communication
- **Day.js**: Lightweight date manipulation and formatting
- **React Context API**: State management for auth, bookings, and notifications

### Backend
- **Node.js v14+**: JavaScript runtime environment
- **Express.js**: Fast, minimalist web application framework
- **MongoDB**: NoSQL database for flexible data storage
- **Mongoose**: Elegant MongoDB object modeling with schemas and validation
- **JWT (jsonwebtoken)**: Secure authentication and authorization
- **Socket.io**: Real-time bidirectional event-based communication
- **Multer**: Middleware for handling multipart/form-data (file uploads)
- **Nodemailer v6.9.7**: Email sending with SMTP support
- **SendGrid API**: Professional email delivery service (100 emails/day free)
- **bcryptjs**: Password hashing and security
- **node-cron**: Scheduled tasks for overdue checking and maintenance
- **cors**: Cross-Origin Resource Sharing middleware

### File Storage
- **Configurable Upload System**: Automatic switching between storage methods
  - **Cloudinary**: Cloud-based image and file storage (production)
  - **Local Storage**: Disk-based storage for development
- **Automatic Detection**: Uses Cloudinary if credentials are configured, falls back to local storage

### Email System
- **SendGrid API**: Production email delivery with high reliability (100 emails/day free)
- **Ethereal**: Development email testing (auto-configured fallback)
- **Environment-based Configuration**: Automatic provider selection

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**
- **Git**

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/rahoodsfamily-lang/car-rental-system.git
cd car-rental-system
```

### 2. Install Dependencies

#### Backend
```bash
cd server
npm install
```

#### Frontend
```bash
cd client
npm install
```

### 3. Environment Configuration

#### Backend Setup
1. Navigate to the `server` directory
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Update the `.env` file with your configuration:
   ```env
   # Database
   DB_URI=mongodb://localhost:27017/car-rental
   # Or use MongoDB Atlas for cloud database:
   # DB_URI=mongodb+srv://username:password@cluster.mongodb.net/car-rental
   
   # Server
   JWT_SECRET=your-super-secret-jwt-key-change-this
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   
   # Session
   SESSION_SECRET=your-super-secret-session-key-change-this
   
   # Email Configuration (Choose one option)
   
   # Option 1: SendGrid API (Recommended for Production)
   EMAIL_SERVICE=sendgrid
   SENDGRID_API_KEY=your-sendgrid-api-key
   EMAIL_FROM="Car Rental System <your-email@example.com>"
   
   # Option 2: Ethereal (Development - Auto-configured)
   # Leave email settings empty and system will use Ethereal automatically
   
   # File Upload Configuration (Optional - Cloudinary)
   # If not configured, system automatically uses local storage
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

#### Frontend Setup
1. Navigate to the `client` directory
2. Create a `.env` file:
   ```bash
   touch .env
   ```
3. Add the following:
   ```env
   REACT_APP_API_URL=http://localhost:5000
   ```

### 4. Database Setup

#### Start MongoDB
```bash
# If using local MongoDB
mongod
```

#### Create Admin Account
```bash
cd server
node scripts/createAdmin.js
```

This will create an admin account with:
- **Email**: `admin@carrentalsystem.com`
- **Password**: `Admin123!@#`

⚠️ **Important**: Change these credentials after first login!

## 🏃 Running the Application

### Development Mode

#### Start Backend Server
```bash
cd server
npm run dev
```
The server will run on `http://localhost:5000`

#### Start Frontend Development Server
```bash
cd client
npm start
```
The application will open at `http://localhost:3000`

### Production Mode

#### Build Frontend
```bash
cd client
npm run build
```

#### Start Backend
```bash
cd server
npm start
```

## 📁 Project Structure

```
car-rental-system/
├── client/                 # React frontend
│   ├── public/            # Static files
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── features/      # Feature-based modules
│   │   │   ├── admin/     # Admin features
│   │   │   ├── auth/      # Authentication
│   │   │   ├── booking/   # Booking management
│   │   │   ├── cars/      # Vehicle browsing
│   │   │   ├── dashboard/ # Dashboard
│   │   │   ├── notifications/ # Notification system
│   │   │   ├── payment/   # Payment processing
│   │   │   └── rental/    # Rental management
│   │   ├── contexts/      # React contexts
│   │   ├── utils/         # Utility functions
│   │   └── theme/         # MUI theme configuration
│   └── package.json
│
├── server/                # Node.js backend
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   ├── socket/           # Socket.io configuration
│   ├── scripts/          # Utility scripts
│   │   ├── createAdmin.js    # Create admin account
│   │   └── clearDatabase.js  # Clear database
│   └── package.json
│
├── .gitignore
└── README.md
```

## 🔑 Default Credentials

### Admin Account
- **Email**: `admin@carrentalsystem.com`
- **Password**: `Admin123!@#`

⚠️ **Security**: Change these credentials immediately after first login!

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Main Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password/:token` - Reset password with token
- `GET /auth/verify-email/:token` - Verify email address
- `GET /auth/me` - Get current user profile

#### Cars
- `GET /cars` - Get all available cars (public)
- `GET /cars/:id` - Get car details by ID
- `POST /admin/cars` - Create new car (Admin)
- `PUT /admin/cars/:id` - Update car details (Admin)
- `DELETE /admin/cars/:id` - Delete car (Admin)
- `GET /admin/cars` - Get all cars including unavailable (Admin)

#### Bookings
- `GET /bookings` - Get user's bookings
- `GET /bookings/:id` - Get booking details
- `POST /bookings` - Create new booking
- `PUT /bookings/:id` - Update booking
- `DELETE /bookings/:id` - Cancel booking (triggers refund calculation)
- `GET /admin/bookings` - Get all bookings (Admin)
- `PUT /admin/bookings/:id/approve` - Approve booking (Admin)
- `PUT /admin/bookings/:id/reject` - Reject booking (Admin)

#### Payments
- `POST /payments` - Submit payment with proof
- `GET /payments` - Get all payments (Admin)
- `GET /payments/:id` - Get payment details
- `GET /payments/booking/:bookingId` - Get payment by booking ID
- `PUT /admin/payments/:id/verify` - Verify payment (Admin)
- `PUT /admin/payments/:id/reject` - Reject payment (Admin)

#### Refunds
- `GET /refunds` - Get all refunds (Admin)
- `GET /refunds/:id` - Get refund details
- `PUT /admin/refunds/:id/process` - Process refund (Admin)
- `GET /refunds/booking/:bookingId` - Get refund by booking ID

#### Rentals
- `GET /rentals` - Get user's rentals
- `GET /rentals/:id` - Get rental details
- `POST /admin/rentals/checkout` - Checkout rental (Admin)
- `PUT /admin/rentals/:id/complete` - Complete rental (Admin)
- `GET /admin/rentals` - Get all rentals (Admin)
- `GET /admin/rentals/overdue` - Get overdue rentals (Admin)

#### Notifications
- `GET /notifications/:userId` - Get user notifications
- `GET /notifications/:id` - Get notification details
- `PUT /notifications/:id/seen` - Mark notification as seen
- `DELETE /notifications/:id` - Delete notification
- `POST /admin/notifications/send` - Send bulk notification (Admin)

#### Users
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `PUT /users/profile/picture` - Update profile picture
- `GET /admin/users` - Get all users (Admin)
- `GET /admin/users/:id` - Get user details (Admin)

#### Admin
- `GET /admin/dashboard/stats` - Get dashboard statistics
- `GET /admin/health` - Get system health status
- `POST /admin/check-overdue` - Manually trigger overdue check
- `GET /admin/payment-settings` - Get payment settings
- `PUT /admin/payment-settings` - Update payment settings

## 🔧 Utility Scripts

### Create Admin Account
```bash
cd server
node scripts/createAdmin.js
```
Creates a default admin account with credentials:
- Email: `admin@carrentalsystem.com`
- Password: `Admin123!@#`

### Update Notification Settings
```bash
cd server
node scripts/updateNotificationSettings.js
```
Updates all users' notification settings to include new notification types.

### Test Email Configuration
```bash
cd server
node scripts/testGmailSetup.js
```
Tests email delivery with current configuration (SendGrid/Gmail/Ethereal).

### Manual Overdue Check
```bash
cd server
node scripts/checkOverdue.js
```
Manually triggers the overdue rental detection system.

### Clear Database
```bash
cd server
node scripts/clearDatabase.js
```
⚠️ **Warning**: This will delete ALL data from the database! Use only for development/testing.

## 🎨 Key Features Explained

### Operating Hours & Booking Restrictions
- **Operating Hours**: 8:00 AM – 5:00 PM daily
- **Smart Booking Rules**:
  - **Before 5:00 PM**: Customers can book for today or any future date
  - **After 5:00 PM**: Today becomes unavailable; customers can only book for tomorrow onwards
  - **Frontend Enforcement**: Date picker automatically disables invalid dates
  - **Backend Validation**: Double-checks booking dates for security
  - **User Feedback**: Clear messages and alerts about booking restrictions

### Payment System
- **Multiple Payment Methods**:
  - **GCash**: Upload payment proof with QR code scanning
  - **PayMaya**: Upload payment proof with QR code scanning
  - **Cash on Pickup**: Pay when collecting the vehicle
- **Admin Verification Required**: ALL payments (including cash) require admin approval before booking confirmation
- **Payment Proof Upload**: 
  - Secure image upload with 60-second timeout handling
  - Supports JPG, JPEG, PNG formats
  - Maximum 5MB file size
- **Payment Settings Management**:
  - Admin can enable/disable payment methods
  - Upload custom QR codes for GCash/PayMaya
  - Set account details
  - System ensures at least one payment method is always available

### Refund System
- **Automatic Refund Calculation**: Based on time until pickup
  - **24+ hours before**: 100% refund
  - **12-24 hours before**: 50% refund
  - **Less than 12 hours**: 0% refund (no refund)
- **Refund Preview**: Customers see refund amount before confirming cancellation
- **Admin Processing**: Admins can review and process refunds with notes
- **Refund Tracking**: Complete history of all refund requests and processing
- **Notifications**: Both customer and admin receive refund status updates

### Late Fee System
- **Automatic Calculation**: 20% of daily rental rate per overdue day
- **Real-time Updates**: Late fees calculated when rental is completed
- **Overdue Detection**: Hourly automated checks for overdue rentals
- **Admin Notifications**: High-priority alerts for overdue rentals
- **Invoice Integration**: Late fees appear in completion notifications and reports

### Notification System
- **Dual Delivery**: In-app notifications + Email notifications
- **Real-time Updates**: Socket.io for instant in-app notifications
- **Email Integration**: 
  - **SendGrid API**: Production email delivery (100 emails/day free)
  - **Ethereal**: Automatic fallback for development/testing
- **Granular Control**: Users can customize preferences for each notification type
- **Notification Types**:
  - Booking confirmations, updates, and cancellations
  - Payment verification and rejection
  - Rental checkout and completion
  - Overdue alerts with late fee information
  - Refund request and processing
  - Admin alerts for critical actions
- **Smart Consolidation**: Combined notifications to reduce clutter (e.g., payment verification + booking confirmation in one message)

### File Upload System
- **Configurable Storage**: Automatic switching between storage methods
  - **Cloudinary**: Cloud storage for production (if credentials configured)
  - **Local Storage**: Disk storage for development (automatic fallback)
- **Upload Types**:
  - Car images (5MB limit, multiple images per car)
  - Profile pictures (3MB limit)
  - Payment proof (5MB limit)
- **Smart Deletion**: Automatically handles file cleanup for both storage methods

### Automatic Maintenance System
- **Smart Car Availability Management**: Automatically manages car status based on maintenance schedule
- **Automatic Status Updates**:
  - **When Scheduling**: If maintenance is scheduled for today or past → Car immediately set to "maintenance"
  - **When Starting Work**: Status = "in_progress" → Car set to "maintenance"
  - **When Completing**: Status = "completed" → Car automatically set to "available"
  - **When Cancelling**: Status = "cancelled" → Car automatically set to "available"
- **Daily Scheduler**: Runs at 8:00 AM to check for maintenance scheduled for today
- **Admin Notifications**:
  - Notification when maintenance starts (lists affected vehicles)
  - Notification when maintenance completes (confirms car is available)
  - Daily reminders about cars currently in maintenance (1:00 AM)
- **Zero Manual Intervention**: No need to manually change car availability status
- **Prevents Booking Conflicts**: Cars in maintenance are automatically unavailable for bookings

### Overdue Detection & Management
- **Automated Checking**: Cron job runs every hour to detect overdue rentals
- **Manual Trigger**: Admin can manually trigger overdue check via API
- **Status Updates**: Automatically changes rental status from 'active' to 'overdue'
- **Notifications**: Sends alerts to both customer and admin
- **Dashboard Integration**: Overdue rentals appear in priority alerts on admin dashboard

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service
mongod
```

### Port Already in Use
```bash
# Kill process on port 5000 (Backend)
npx kill-port 5000

# Kill process on port 3000 (Frontend)
npx kill-port 3000
```

### Clear Node Modules and Reinstall
```bash
# Backend
cd server
rm -rf node_modules package-lock.json
npm install

# Frontend
cd client
rm -rf node_modules package-lock.json
npm install
```

## 📝 Environment Variables

### Required Variables
- `DB_URI` - MongoDB connection string (local or Atlas)
- `JWT_SECRET` - Secret key for JWT token generation
- `SESSION_SECRET` - Secret key for session management
- `PORT` - Server port (default: 5000)
- `FRONTEND_URL` - Frontend URL for CORS configuration

### Email Configuration (Choose One)

#### SendGrid (Production - Recommended)
- `EMAIL_SERVICE=sendgrid`
- `SENDGRID_API_KEY` - Your SendGrid API key (100 emails/day free)
- `EMAIL_FROM` - Sender email address

#### Ethereal (Development - Auto-configured)
- Leave email variables empty for automatic Ethereal configuration
- Perfect for testing without external dependencies

### File Upload Configuration (Optional)
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- If not configured, system uses local file storage automatically

### System Configuration
- Operating hours and booking rules are configured in `server/config/rentalConfig.js`
- Refund policy is configured in `server/config/refundPolicy.js`
- Late fee calculation is configured in `server/utils/lateFeeCalculator.js`

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Authors

- **Rahoods Family** - [GitHub](https://github.com/rahoodsfamily-lang)

## 🙏 Acknowledgments

- Material-UI for the beautiful component library
- MongoDB for the flexible database
- Socket.io for real-time communication
- SendGrid for reliable email delivery

## 📞 Support

For support, email rahoodsfamily@gmail.com or open an issue in the GitHub repository.

---

**Made with ❤️ by Rahoods Family**
