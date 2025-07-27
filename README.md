# 📋 Ticket Desk – Backend

**Ticket Desk** is a robust backend ticketing and escalation system designed to manage user support tickets, automatic/manual escalations, team assignments, and resolution tracking. It offers role-based authentication (admin, agent, user) and integrates AI-assisted categorization and team assignment.

---

## 🚀 Features

- ✅ JWT-based authentication & role-based access control  
- 📂 Ticket creation, assignment, escalation, resolution, and closure  
- 🤖 AI-powered category/subcategory prediction and team selection  
- 🧑‍💼 Admin & Agent role management  
- 📧 Email notifications for user updates & password resets  
- 🛠️ Escalation thresholds and history tracking  
- 📊 Resolution and escalation metrics API  

---

## 🛠️ Tech Stack

- **Runtime:** Node.js  
- **Framework:** Express.js  
- **Database:** MongoDB + Mongoose  
- **Authentication:** JWT  
- **Validation:** express-validator  
- **Email Service:** Nodemailer  
- **AI Integration:** Cohere API  

---

## 📁 Project Structure

├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── validators/
├── .env
├── server.js
└── README.md


---

## ⚙️ Environment Variables (`.env`)

```env
PORT=5000
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_jwt_secret

# SMTP config for email service
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your_email@yourdomain.com
SMTP_PASS=your_email_password
SMTP_FROM=your_email@yourdomain.com

# Base URL
BASEURL=http://localhost:5000

# AI Token
COHERE_API_KEY=your_cohere_api_key

# App Name
APP_NAME=Ticket Desk

git clone https://github.com/your-username/ticket-desk-backend.git
cd ticket-desk-backend
npm install
cp .env.example .env   # then update with your own credentials
npm run dev            # or: node server.js


🔐 Authentication Routes (/api/auth)
Method	Route	Description
POST	/register	User registration
POST	/login	User login
POST	/refresh-token	Refresh JWT
POST	/request-password-reset	Send reset token via email
POST	/reset-password	Reset password using token
POST	/logout	Logout user
PUT	/update-profile	Update user profile
GET	/profile	Get current user profile

🧾 Ticket Routes (/api/tickets)
Method	Route	Description
POST	/create-ticket	Create new ticket
GET	/	Get all tickets
GET	/:id	Get ticket details
POST	/:id/comments	Add comment
PATCH	/:id/status	Update ticket status
POST	/:id/escalate	Escalate ticket

🧠 AI & Escalation
Auto Assignment: AI recommends the best team and agent based on category, subcategory & description.

Auto Categorization: Predicts category/subcategory using ticket description.

Escalation Levels: Tracks escalation levels and escalated teams.

🧑‍🤝‍🧑 Escalation Teams (/api/escalation-teams)
Method	Route	Description
POST	/create-team	Create a team
GET	/teams	Get all teams
GET	/teams/:id	Get specific team
PUT	/teams/:id	Update team
DELETE	/teams/:id	Delete team
POST	/teams/:teamId/members	Add team member
DELETE	/teams/:teamId/members	Remove team member

📊 Escalation Thresholds (/api/thresholds)
Method	Route	Description
POST	/create-thershold	Create threshold
GET	/	Get all thresholds
GET	/:id	Get threshold by ID
PUT	/:id	Update threshold
DELETE	/:id	Delete threshold
GET	/validate	Validate thresholds

🗂️ Categories (/api/categories)
Method	Route	Description
POST	/create-category	Create a category
GET	/get-categories	Get all categories
GET	/get-category/:id	Get category by ID
PUT	/update-category/:id	Update category
DELETE	/delete-category/:id	Delete category

✅ Resolutions (/api/resolutions)
Method	Route	Description
POST	/tickets/:id/resolve	Resolve ticket
POST	/tickets/:id/close	Close ticket
POST	/tickets/:id/reject	Reject ticket
GET	/metrics/resolutions	Get resolution stats

📬 Email Notifications
Password reset
Ticket creation alerts
Ticket status updates for users and agents

🧪 Future Improvements

AI Feedback loop for improved suggestions
File upload to S3 / Cloudinary
Audit logs
Real-time updates with Socket.io

📄 License
MIT License


