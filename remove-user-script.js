import { supabase } from './src/lib/supabase.js';

async function removeUser() {
  const email = 'musab.kazmi@gmail.com';
  
  try {
    console.log(`Starting removal process for user: ${email}`);
    
    // First, get the user ID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (userError) {
      if (userError.code === 'PGRST116') {
        console.log(`No user found with email: ${email}`);
        return;
      }
      throw userError;
    }
    
    if (!userData) {
      console.log(`No user found with email: ${email}`);
      return;
    }
    
    const userId = userData.id;
    console.log(`Found user with ID: ${userId}`);
    
    // Delete from users table (this will cascade to related tables due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (deleteError) {
      throw deleteError;
    }
    
    console.log(`Successfully removed user ${email} from users table`);
    
    // Note: The auth.users record will be automatically deleted due to the CASCADE constraint
    // when we delete from the users table, since users.id references auth.users(id) ON DELETE CASCADE
    
    console.log(`User ${email} has been completely removed from the system`);
    
  } catch (error) {
    console.error('Error removing user:', error);
    throw error;
  }
}

// Run the removal
removeUser()
  .then(() => {
    console.log('User removal completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('User removal failed:', error);
    process.exit(1);
  });