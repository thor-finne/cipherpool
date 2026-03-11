import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Supabase client (server-side)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // service key (not anon key)
);

// ============================================
// AUTH MIDDLEWARE
// ============================================
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user role from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    req.user = {
      ...user,
      role: profile?.role || 'user'
    };
    
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    next();
  };
};

// ============================================
// TOURNAMENT ROUTES
// ============================================

// Create tournament
app.post('/api/tournaments', authenticate, authorize('founder', 'super_admin'), async (req, res) => {
  try {
    const { name, description, game_type, mode, max_players, entry_fee, prize_coins, start_date, banner_url, background_color } = req.body;

    // Validate input
    if (!name || !game_type || !mode || !max_players || !prize_coins) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create tournament
    const { data, error } = await supabase
      .from('tournaments')
      .insert([{
        name,
        description,
        game_type,
        mode,
        max_players,
        entry_fee: entry_fee || 0,
        prize_coins,
        start_date,
        banner_url,
        background_color: background_color || '#6D28D9',
        created_by: req.user.id,
        status: 'open',
        current_players: 0
      }])
      .select()
      .single();

    if (error) throw error;

    // Log action
    await supabase
      .from('admin_logs')
      .insert([{
        user_id: req.user.id,
        action: 'create_tournament',
        details: { tournament_id: data.id, tournament_name: name }
      }]);

    res.json({ success: true, tournament: data });
  } catch (err) {
    console.error('Error creating tournament:', err);
    res.status(500).json({ error: err.message });
  }
});

// Join tournament
app.post('/api/tournaments/:id/join', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Get tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();

    if (tournamentError || !tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if tournament is open
    if (tournament.status !== 'open') {
      return res.status(400).json({ error: 'Tournament is not open' });
    }

    // Check if tournament is full
    if (tournament.current_players >= tournament.max_players) {
      return res.status(400).json({ error: 'Tournament is full' });
    }

    // Check if user already requested
    const { data: existing } = await supabase
      .from('tournament_participants')
      .select('id')
      .eq('tournament_id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Already requested to join' });
    }

    // Create join request
    const { data, error } = await supabase
      .from('tournament_participants')
      .insert([{
        tournament_id: id,
        user_id: req.user.id,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, request: data });
  } catch (err) {
    console.error('Error joining tournament:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// SUPPORT TICKETS
// ============================================

// Create support ticket
app.post('/api/support/tickets', authenticate, async (req, res) => {
  try {
    const { subject, category, priority, message } = req.body;

    if (!subject || !category || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert([{
        user_id: req.user.id,
        subject,
        category,
        priority: priority || 'normal',
        status: 'open'
      }])
      .select()
      .single();

    if (ticketError) throw ticketError;

    // Add first message
    const { error: messageError } = await supabase
      .from('support_messages')
      .insert([{
        ticket_id: ticket.id,
        sender_id: req.user.id,
        message
      }]);

    if (messageError) throw messageError;

    res.json({ success: true, ticket });
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reply to ticket
app.post('/api/support/tickets/:id/reply', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if user has access to this ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (ticketError || !ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check access
    if (ticket.user_id !== req.user.id && req.user.role === 'user') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Add message
    const { data, error } = await supabase
      .from('support_messages')
      .insert([{
        ticket_id: id,
        sender_id: req.user.id,
        message
      }])
      .select()
      .single();

    if (error) throw error;

    // Update ticket status
    await supabase
      .from('support_tickets')
      .update({ status: req.user.role === 'user' ? 'answered' : 'pending' })
      .eq('id', id);

    res.json({ success: true, message: data });
  } catch (err) {
    console.error('Error replying to ticket:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// WALLET OPERATIONS
// ============================================

// Grant coins (super admin only)
app.post('/api/admin/grant-coins', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { target_user, amount, reason } = req.body;

    if (!target_user || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    if (amount > 10000) {
      return res.status(400).json({ error: 'Amount cannot exceed 10,000' });
    }

    // Call the RPC function
    const { data, error } = await supabase
      .rpc('grant_coins', {
        target_user,
        amount
      });

    if (error) throw error;

    // Log the action
    await supabase
      .from('admin_logs')
      .insert([{
        user_id: req.user.id,
        action: 'grant_coins',
        details: { target_user, amount, reason }
      }]);

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error granting coins:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// CHAT MODERATION
// ============================================

// Delete message (moderator only)
app.delete('/api/chat/messages/:id', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('room_messages')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mute user
app.post('/api/chat/mute', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { user_id, duration_minutes } = req.body;

    const muted_until = new Date();
    muted_until.setMinutes(muted_until.getMinutes() + duration_minutes);

    const { error } = await supabase
      .from('user_mutes')
      .insert([{
        user_id,
        muted_by: req.user.id,
        muted_until: muted_until.toISOString()
      }]);

    if (error) throw error;

    res.json({ success: true, muted_until });
  } catch (err) {
    console.error('Error muting user:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ADMIN LOGS
// ============================================

app.get('/api/admin/logs', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('admin_logs')
      .select(`
        *,
        user:profiles!admin_logs_user_id_fkey (
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json({ success: true, logs: data });
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});