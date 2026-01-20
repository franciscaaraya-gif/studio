# **App Name**: E-lector

## Core Features:

- Admin Authentication: Secure admin login via email/password using Firebase Authentication.
- User Authentication: User authentication via email link or unique ID, managed by Firebase Authentication.
- Create and Manage Polls: Admins can create polls with questions, options, and set poll status (open/closed).
- Voter Registry: Manage voter eligibility and voting status via a Firestore collection, linked to each poll.
- Anonymous Voting: Record votes anonymously in Firestore, storing only the selected option and poll ID.
- Result Disclosure: AI tool to securely expose the results only after the poll status is 'closed'

## Style Guidelines:

- Primary color: Deep Blue (#3F51B5) to inspire trust and security, suitable for a voting platform.
- Background color: Light Grey (#F0F2F5), a desaturated shade of blue providing a clean, neutral backdrop to focus attention.
- Accent color: Cyan (#00BCD4), an analogous hue to deep blue that draws the eye for important calls to action
- Body and headline font: 'Inter' sans-serif for a modern and accessible feel.
- Use simple, clear icons to represent actions and status, ensuring ease of understanding.
- Clean, well-organized layout to guide users through the voting process. Focus on accessibility and ease of use.
- Subtle animations for feedback and transitions to enhance user experience without distracting from the core task.