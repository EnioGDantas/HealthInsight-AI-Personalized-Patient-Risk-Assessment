
# 🧠 AI Health Platform Prototype

## Overview

**AI Health Platform** is a browser-based prototype simulating an AI-powered virtual health assistant. Through a step-by-step conversational interface, it collects patient information—demographics, medical history, lifestyle, and biometric data—and returns personalized health feedback.

This solution is designed to support preventive healthcare by aligning user data with regional public health benchmarks. While currently rule-based and built with vanilla JavaScript, it is fully structured for future AI integration (LLMs and predictive modeling).

---

## 🚀 Features

- 💬 **Conversational Chat Interface**  
  Natural, message-based interaction for clinical data collection.

- 📝 **Multi-step Patient Questionnaire**  
  Gathers comprehensive patient data across categories:
  - Identification: name, age, gender, ethnicity  
  - Medical history: allergies, conditions, surgeries  
  - Lifestyle: physical activity, diet, alcohol, smoking  
  - Biometrics: BMI, blood pressure, cholesterol, glucose

- 📊 **Real-time Feedback**  
  Displays personalized analysis based on BMI, blood pressure, and glucose, following CDC/Georgia guidelines.

- ⚡ **Smooth User Experience**  
  - Auto-scrolling chat UI  
  - `Enter` to send, `Shift+Enter` for multiline  
  - Clean layout and mobile-friendly design

---

## 📁 Project Structure

```
AI-Health-Platform/
├── index.html                # Main HTML page (chat interface)
├── style/
│   └── style.css             # UI styles (chat layout, colors, fonts)
├── images/
│   └── background.jpg        # Background image for interface
```

---

## 🧪 How to Use

1. Clone this repository:
   ```bash
   git clone https://github.com/EnioGDantas/HealthInsight-AI-Personalized-Patient-Risk-Assessment.git
   ```
2. Open the project folder  
3. Simply open `index.html` in any modern web browser  
4. Start interacting with the virtual assistant

---

## 🧬 Built With

- **HTML5**  
- **CSS3** (flexbox layout, gradients, backgrounds)  
- **Vanilla JavaScript** (DOM events, dynamic message flow)

---

## 🔮 Future Roadmap

| Feature                     | Status     | Notes |
|-----------------------------|------------|-------|
| AI health risk prediction   | 🔜 Planned  | Integration with ML or LLM models via API |
| Backend with FastAPI        | 🔜 Planned  | JSON API with BMI, BP, glucose processing |
| SHAP explainability         | 🔜 Planned  | Per-patient feature contribution insights |
| PDF report & email delivery | 🔜 Planned  | Secure export of health analysis |
| Docker support              | 🔜 Planned  | For local and production deployment |
| GitHub Actions (CI)         | 🔜 Planned  | Auto-test future Python code |
| HIPAA-compliant storage     | 🔜 Planned  | For clinical/real deployment environments |

---

## 🌐 Hosting via GitHub Pages

If you're viewing this project online via GitHub Pages:

  `https://eniogdantas.github.io/HealthInsight-AI-Personalized-Patient-Risk-Assessment/`

---

## 🧠 Example Outputs

After data collection, the assistant returns:

- **BMI Category**: Normal / Overweight / Obese  
- **Blood Pressure Status**: Normal / Elevated  
- **Glucose Risk**: Normal / Prediabetic / Diabetic  
- **Lifestyle Recommendations** tailored to user metrics

---

## 📄 License

**Custom License – Educational Use Only**  
© 2025 [Enio Dantas](mailto:enio.danttas@gmail.com)

This project is provided **strictly for academic, demonstration, and non-commercial purposes**.

### ❌ You may NOT:
- Redistribute or publish this project or parts of it  
- Modify and reuse for commercial or governmental use  
- Deploy this project for production without explicit permission

### ✅ You may:
- Study and review the source code  
- Reference or fork for internal learning or testing  
- Use it as inspiration for similar educational projects

---

## 🤝 Contact

📧 Email: [enio.danttas@gmail.com](mailto:enio.danttas@gmail.com)  
🔗 LinkedIn: [linkedin.com/in/eniogdantas](https://linkedin.com/in/eniogdantas)

---
