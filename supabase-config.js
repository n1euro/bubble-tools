
const SUPABASE_URL = "https://brivplwrtnxdfaomvuph.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_4StOFtphJ-3MbgwHBvFdTw_XpwBF4AP";

// Создаём подключение к Supabase
if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase SDK не загружен!");
} else {
    window.supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    console.log("Bubble Tools подключён к Supabase!");
}
