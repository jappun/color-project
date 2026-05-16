# Color Post-Diagnosis Support Tool
AI-powered intake for recently diagnosed cancer patients  
---

### Live Demo
https://color-project-wp5c.vercel.app/

Note that backend service is run on Render's free tier, so you may need to wait for it to spin up.

### Why

The purpose of this project is to demo a possible feature in Color's AI-focussed products.

Currently, Color's Cancer Copilot helps the care team do their work faster, but in the meantime the patient is still waiting. I was partly inspired by Color's existing product Color Assistant for breast cancer screening, since the AI also addresses questions brought up by the user. I thought this idea could be expanded to all patients. The feeling of waiting for answers can be anxiety-inducing and overwhelming so this tool is meant to alleviate some of the feelings sparked by uncertainity that a recently diagnosed patient may have.

One aspect I wanted to add is a sense of agency, which I aimed to achive through the Questions section. Navigating the healthcare system can feel confusing or like a foreign language. This section goes beyond information and into providing patients a sense of familarity in how to engage with their care team and feel active in their treatment plan.

### How It Works

1. Patient fills out an intake form
2. Their input is sent to a FastAPI backend, which retrieves relevant clinical guidelines from a local knowledge base informed by cancer.org
3. Gemini generates three personalized sections: a plain-language diagnosis explainer, possible next steps, and questions to bring to their oncologist
4. Results are presented one section at a time, with tabs to revisit any section

### Future Implemtation
- Only for patients right now. Create a similar flow for caregivers/family members.
- Currently only includes two types of cancers. Broaden to all types.
- A more sophisticated process (RAG) for generating answers. Currently pulls from some high-level information found on cancer.org.

### Tech Stack
- React
- Vite
- Typescript
- FastAPI
- Python
- Gemini API
- Cursor
- Render
- Vercel

I chose this tech stack, because I am familiar with it. I wanted to deploy quickly to validate my idea. I used Cursor to speed up development, especially for frontend tasks.
