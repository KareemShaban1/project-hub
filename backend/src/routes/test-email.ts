import { Router } from 'express';
import { sendInvitationEmail } from '../services/email.js';

const router = Router();

// Test email endpoint (for debugging)
router.post('/test', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('🧪 Testing email to:', email);
    
    await sendInvitationEmail({
      to: email,
      inviterName: 'Test User',
      projectName: 'Test Project',
      role: 'MEMBER',
      inviteLink: 'http://localhost:5173/invite/test-token',
      expiresIn: '7 days',
    });

    res.json({ 
      success: true, 
      message: 'Test email sent. Check console for details.' 
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      error: 'Failed to send test email', 
      details: error.message 
    });
  }
});

export default router;



