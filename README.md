# VA Backend Documentation 

Backend repository for the **Go Exchange** project (Metropolia Software Factory). <br>

**[Frontend Repository](https://github.com/karripar/go-exchange-client)**<br>
**[AI Chat Service Repository](https://github.com/samukan/va-chat-service)**<br>
**[TypeScript Hybrid Types Module](https://github.com/karripar/go-exchange-types)**

---

## Tech Stack & Overview

This project is built using a **microservices**-inspired architecture, divided into three core servers and two auxiliary services.

* **Core Technologies:** **Node.js**, **Express**, and **MongoDB** (Mongoose ORM).
* **Authentication:** Google Sign-In (OAuth 2.0) and custom local authentication.
* **Testing:** Vitest + Supertest (Found in *`test`* folder)

### Service Structure and Instructions

**[Service structure in Draw.io format](https://drive.google.com/file/d/1OXwYz6CcNq0LxBoS2yffzkEfYRRD2bbf/view?usp=sharing)**

**[Service instructions for Admins](https://metropoliafi-my.sharepoint.com/:w:/g/personal/karripar_metropolia_fi/IQD7dpuTswCNRqPJ7Q9JW1c5AT8gULAZKcMUEhrIll6l16E?e=Pig878)**

**Sensitive credentials and information are provided privately**

### Core Servers (Microservices)

| Server | Primary Function | Port (Example) |
| :--- | :--- | :--- |
| `auth-server` | User authentication, session management, and role-based access control. | 3001 |
| `content-server` | Core application logic, destination data scraping, and content storage. | 3002 |
| `upload-server` | File and image handling, storage, and serving static files. | 3003 |

### Auxiliary Services

| Service | Function | Note |
| :--- | :--- | :--- |
| `sync-service` | Responsible for synchronizing data, such as refreshing the OpenAI vector store. | **Paid/Credit Card Required** |

---

## Server Features & API Routes

All primary API routes are prefixed by **`/api/v1/`**.

### Auth Server

* **Purpose:** User management and access control.
* **Key Features:** User authentication (Google Sign-In & custom login), **Role-based access** (Exchange coordinators as admins), Profile-specific content.

| Route Group | Description |
| :--- | :--- |
| `/auth` | Login, logout, and token handling. |
| `/users` | User creation and general user management. |
| `/profile` | Fetching and updating the current user's profile and related info. |
| `/admin` | Admin-specific user and role actions. |
| `/applications` | Application handling routes. | 
| `/budgets` | Handling budgeting for planning an exchange period. |
| `/grants` | Information about grants students are eligible to |
| `/ai/chat` | AI Chat and RAG handling |   

### Content Server

* **Purpose:** Core data handling and business logic.
* **Key Features:**
    * **Metropolia Exchange destination webscraping** (with coordinate data attached from a static JSON file).
    * Partner university data scraping logic and a **caching mechanism** (scraped weekly).
    * Application instructions and contact information management.
    * Exchange stories and user experiences.
    * Admin actions related to the above features.

| Route Group | Description |
| :--- | :--- |
| `/destinations` | Accessing and managing exchange destination data and scraping url storage |
| `/instructions` | Application instructions |
| `/contact` | Contact information storage and modification. |
| `/exchange-stories` | Handling adding/deleting/modifying student exchange stories | 

### Upload Server

* **Purpose:** Handling file persistence.
* **Key Features:** Image and file upload logic using **Multer**. File modification and deletion.
* **Static Serving:** Files are served statically from the `uploads` folder.
    * **Base URL:** `http://localhost:3003/uploads/[filename]`

| Route Group | Description |
| :--- | :--- |
| `/upload` | Single file upload endpoints, story photos |
| `/uploads` | File listing and management endpoints. |
| `/linkUploads` | Endpoints for handling link based uploads (links to user's documents) | 

---

## Project Documentation

In addition to this `.md` documentation, the project includes two types of automatically generated documentation for each server.

| Documentation Type | Content Focus | Generation Command | Access Path (Local) |
| :--- | :--- | :--- | :--- |
| **Auth ApiDoc** | Documents the available **API routes** (endpoints). | `npm run apidoc` | `/docs/apidoc/index.html` |
| **Auth TypeDoc** | Documents **controllers** and core code (e.g., CRUD operations). | `npm run typedoc` | `/docs/typedoc/index.html` |

All available documentation routes:

| Server | Documentation Type |Access Path (Local) |
| :--- | :--- | :--- |
| **auth-server** | **Apidoc** | `/auth/docs/apidoc/index.html` |
| **auth-server** | **TypeDoc** | `/auth/docs/typedoc/index.html` |
| **content-server** | **Apidoc** | `/content/docs/apidoc/index.html` |
| **content-server** | **TypeDoc** | `/content/docs/typedoc/index.html` |
| **upload-server** | **Apidoc** | `/upload/docs/apidoc/index.html` |
| **upload-server** | **TypeDoc** | `/upload/docs/typedoc/index.html` |

By default, all documentation are protected with a **username/password** combination:
| Default Username | Default Password |
| :--- | :--- |
| `admin` | `defaultPassword` |
---

## Project Installation Guide

**Note:** This guide must be followed for **each server subfolder** (`auth-server`, `content-server`, `upload-server`, etc.). Do not run commands from the repository root.

### 1. Prerequisites

1.  **Repository:** Clone the repository to your desired directory.
2.  **Node.js & NPM:** Ensure a stable release version is installed.

### 2. MongoDB Setup

Choose **one** of the following options:

1.  **Local Community Server (Recommended):**
    * Install the MongoDB Community Server [here](https://www.mongodb.com/try/download/community). This includes the graphical tool **MongoDB Compass**.
    * Paste the local connection string (e.g., `mongodb://localhost:27017/dbname`) into the environment variables.
2.  **MongoDB Atlas (Cloud-Hosted):**
    * Use the free basic tier on MongoDB Atlas [here](https://www.mongodb.com/products/platform/atlas-database).
    * Create a cluster, generate a connection string, and paste it into the environment variables.

### 3. Server Setup

1.  Open **separate terminals** for each server subfolder you wish to run.
2.  In each terminal, install the required dependencies: `npm install`
3.  Fill in the required **Environment Variables** (see the next section).
4.  Once MongoDB is running or connected, start the server in development mode: `npm run dev`

* All available commands are found in the respective `package.json` file.

---

## Environment Variables

### Core Configuration

* **`.env` File:** Required variables are found in the **`.env.sample`** file in *each server's subfolder*.
    * Copy the content of the sample file and create a new **`.env`** file.
    * ***IMPORTANT:*** Each server has its own unique set of required variables.
    * ***IMPORTANT:*** Each PM2 process is run from the server/service root where the environment variables are located.

### Google API Client

* To enable the Google OAuth 2.0 flow and authentication, you need to create a Client ID.
* Follow the instructions found [here](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid).
* Place the acquired **Client ID** in the appropriate environment variables. This ID is also required for the front-end application.

---

## Security Measures

* **Validation:** Thorough validation on all inputs using **`express-validator`**.
* **Rate Limiting:** Implemented with **`express-rate-limit`** to mitigate abuse and denial-of-service vectors.
* **Data Caching:** Scraping data is aggressively cached, limited to running **once per week** maximum, to reduce external load and increase response speed.

## CI/CD Pipeline

* Because the hosting virtual machine is behind a firewall in a private network, a **`Smee.io`** webhook was used for the backend and frontend both. 
* **`.Github/worklows`** includes the basic Github Actions Pipeline which handles installing Node packages, building the applications and running tests if present.