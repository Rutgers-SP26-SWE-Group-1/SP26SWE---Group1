# SP26SWE-Group1
Initializing the Project now....

Ved Patel: Logged on Thursday, March 12, 2026 6:42
Ved Patel: Project is now updated with Iteration 1 software requirements. I have completed the complete auth loop and all edits work for creating new user, using without login, being able to verify using supabase, and then chatting, and then logging out. 
This all works. Friday, March 13, 2026.

Running new tests and potential features on Saturday March 14, 2026.

All edits have been made by team members by Monday March 16, 2026.

# 🛡️ Scarlet AI

The official AI interface for the Rutgers community, built for the SP26 Software Engineering project.


## 🚀 Live Demo Project
**Production URL:** [sp26swe-scarlet.vercel.app](https://sp26swe-scarlet.vercel.app)


## ✨ Iteration 1 Milestones
So far we have the following: 

### 🔑 Authentication & User Management
- **Restricted Access and Secure Authentication**: Fully integrated Supabase Auth restricted strictly to `@scarletmail.rutgers.edu` domains.
- **Complete Auth Loop**: Functional flow from Sign-Up → Email Verification Notice → Success Landing → Chat Hub.
- **User Profiles**: Dedicated Profile page allowing users to manage metadata (Full Name, Major, Class Year) and update passwords securely.

### 🤖 UI/UX & Interaction
- **Dynamic AI Showcase**: A state-driven landing page and "Thinking Phase" UI to demonstrate real-time LLM interaction.
- **Security Feedback**: 4-stage sequential password strength meter and confirmation validation.
- **Accessibility**: High-contrast, Rutgers-branded responsive design for mobile and desktop.


### 🧪 Quality Assurance (TDD)
- **Unit Testing**: Jasmine suite for validating authentication logic and email domain restrictions.
- **Behavioral Testing**: Cucumber.js scenarios for verifying the end-to-end user navigation journey.
- **Browser Automation**: Puppeteer-driven "smoke tests" for visual verification of page loading.

- **DevOps & Infrastructure**: 
  - Automated CI/CD pipeline via **Vercel**.
  - Secure environment variable management for database protection.
  - Standardized `.env.example` template for team onboarding.

---

## 🛠️ Local Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone [https://github.com/Rutgers-SP26-SWE-Group-1/SP26SWE---Group1.git](https://github.com/Rutgers-SP26-SWE-Group-1/SP26SWE---Group1.git)
