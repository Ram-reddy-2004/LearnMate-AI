# 🚀 LearnMate AI – An AI-Powered Education Assistant  

LearnMate AI is my project built for the **NextWave Buildathon (by OpenAI)**.  
It’s designed to make learning **smarter, personalized, and interactive** by combining AI + Education.  

---

## 🌟 Features Overview  

- 🔑 **Sign Up / Sign In** → Secure authentication with Firebase (Email/Password).  
- 📂 **LearnVault** → Upload PDFs, notes, images & create your own knowledge base.  
- 📘 **LearnGuide** → Get detailed explanations of every concept & sub-topic.  
- 🤖 **SmartQuiz** → Auto-generates quizzes to sharpen your understanding.  
- 📊 **MyProgress** → Track growth with progress bars & analytics.  
- 🧑‍💻 **TestBuddy** → Practice coding like LeetCode/CodeChef with real-time test cases.  
- 🎯 **SkillPath** → Personalized career roadmap for future skills & goals.  

---

## 🛠️ Tech Stack  

- **Frontend** → HTML, CSS, JavaScript  
- **AI/LLM Integration** → Google AI Studio  
- **Database** → Firebase Firestore  
- **Authentication** → Firebase Auth (Email/Password)  
- **Deployment** → Cloud Run / GitHub Pages  

---

## 📂 Modules Breakdown  

### 🔑 Sign Up / Sign In  
> User authentication & account creation with Firebase.    
## SignUp Page
<img width="1920" height="980" alt="image" src="https://github.com/user-attachments/assets/d18705b2-6ff7-461b-8fc0-18d2c530c72b" />
## Signin Page
<img width="1909" height="981" alt="image" src="https://github.com/user-attachments/assets/cef9c2c5-3f57-4058-99ec-f3a3c87d9390" />




**Features:**  
- User can **create an account (Sign Up)** with email + password.  
- **Sign In** securely to access modules.  
- User profile includes **first-letter avatar** (e.g., John Doe → JD).  
- Stores user details (name, email, progress) in **Firestore**.  
- Connected with **MyProgress** to personalize dashboard.  

---

### 1️⃣ LearnVault  
> Your personal knowledge base. Upload text, PDFs, and images to create structured learning material.  

<img width="1920" height="942" alt="image" src="https://github.com/user-attachments/assets/10dd0c4e-2f10-4ba4-81bf-4eb6d2f3be1e" />
<img width="1914" height="984" alt="image" src="https://github.com/user-attachments/assets/4ac3ea0a-ab36-4efc-8c22-c6a73741d3b8" />


**Features:**  
- Upload PDFs, images, links, text, and notes  
- Store them in Firebase  
- Retrieve anytime for future learning  

---

### 2️⃣ LearnGuide  
> Explains concepts in detail with sub-headings. Supports **goal-based outputs** (Exam Prep, Quick Revision, Coding Examples).  

<img width="1907" height="1027" alt="image" src="https://github.com/user-attachments/assets/7f41da29-85c7-45d7-8689-34940aa05b21" />


**Features:**  
- AI-driven detailed explanations
- Explains Concept by Concept
- Text-to-Speech option with highlighted flow  
- Code examples with card-style formatting  

---

### 3️⃣ SmartQuiz  
> Test your knowledge with auto-generated quizzes from LearnVault content.  

<img width="1920" height="989" alt="image" src="https://github.com/user-attachments/assets/d2b2bc30-bbba-44fb-95ba-152e552b631c" />
<img width="1919" height="994" alt="image" src="https://github.com/user-attachments/assets/2e917ee0-1881-4031-ac41-4fa1e5174e72" />


**Features:**  
- Multiple-choice questions (MCQs)  
- Real-time explanation of answers  
- Timer-based quizzes (15 mins default)  

---

### 4️⃣ MyProgress  
> Track how well you’re learning across modules.  

<img width="1903" height="1001" alt="image" src="https://github.com/user-attachments/assets/c4fc794d-8a2e-48c7-afed-53026ccad1ea" />


**Features:**  
- Progress bars linked with Quiz/TestBuddy results  
- Identifies **weakest topics** automatically  
- User profile with initials as avatar  

---

### 5️⃣ TestBuddy  
> Hands-on coding practice like LeetCode/CodeChef.  

<img width="1920" height="625" alt="image" src="https://github.com/user-attachments/assets/d5776196-fcbe-45f7-92f7-c39af4c9bd26" />
<img width="1920" height="877" alt="image" src="https://github.com/user-attachments/assets/16aae5c5-fcf1-4bc9-a31e-ceed285552bd" />
<img width="1920" height="601" alt="image" src="https://github.com/user-attachments/assets/cfbe3673-bcb1-425f-963b-b4eec307ac8f" />
<img width="1917" height="1033" alt="image" src="https://github.com/user-attachments/assets/b8902b5c-371e-473d-ba85-535f5041ed74" />





**Features:**  
- Two modes → **MCQ** + **Coding**  
- Auto-compiles and runs test cases (Work in Progress 🚧)  
- Coding problems with difficulty levels (Easy/Medium/Hard)  
- Timed tests (20 mins each coding problem)  
- Updates MyProgress after submission  

---

### 6️⃣ SkillPath  
> AI-powered career guidance tool that suggests **future skills & learning paths**.  

<img width="1919" height="941" alt="image" src="https://github.com/user-attachments/assets/a3e52f0e-03fd-44ad-88bb-0d84b1af65fb" />
<img width="1920" height="977" alt="image" src="https://github.com/user-attachments/assets/b0404fee-764f-4df5-b306-0b84601f80e0" />
<img width="1920" height="751" alt="image" src="https://github.com/user-attachments/assets/1e8644cf-a8b5-4503-b672-f8f2151d7dbd" />

 

**Features:**  
- Career roadmap based on current strengths  
- Shows industry trends and future skills  
- Integrates with LearnVault knowledge  

---

## ⚡ Current Challenge  

Right now, the **TestBuddy module** shows incorrect results (always `0` output) even for correct code.  
I suspect it’s because the **code is not compiling/executing against test cases**.  
👉 Any insights or solutions are highly welcome!  

---

## 🚀 Future Scope  

- Add **real code execution engine** for TestBuddy  
- Gamification (leaderboards, streaks)  
- Multi-language support  
- AI-powered personalized study plans  

---


## 🧑‍💻 Setup Instructions  

1. Clone the repository  
   ```bash
   git clone https://github.com/your-username/learnmate-ai.git
   cd learnmate-ai

2. Install dependencies (if using Node.js for frontend build system)
   ```bash
   npm install

3. Configure Firebase → Add your firebaseConfig inside /config/firebase.js.

4. Enable Firebase Auth → Turn on Email/Password login in Firebase Console.

5. Run locally
   ```bash
   npm start
6. Deploy (options):
   - GitHub Pages (Free)
   - Firebase Hosting (Free tier)
   - Cloud Run (Free tier)

## 🤝 Contributing
   - Pull requests are welcome! If you’d like to suggest features, raise an issue first.
