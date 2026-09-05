export type Language = 'en' | 'he';

export interface Translations {
  // Brand & Common
  appName: string;
  appTagline: string;
  online: string;
  offline: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  close: string;
  install: string;
  dismiss: string;
  loading: string;
  gotIt: string;
  you: string;
  anyone: string;
  everyone: string;
  unassigned: string;

  // Navigation & Push
  pushOn: string;
  enablePush: string;
  pushActiveNotice: string;
  sendTestNotification: string;
  turnOffNotifications: string;
  signOut: string;
  switchLanguage: string;

  // Personas
  mom: string;
  dad: string;
  teen: string;
  sarahMom: string;
  alexDad: string;
  leoTeen: string;
  adminRole: string;
  memberRole: string;

  // Filters & Tabs
  allOpen: string;
  mine: string;
  dueSoon: string;
  completed: string;
  filterBy: string;

  // Task Cards
  nudge: string;
  nudged: string;
  todayAt: string;
  overdue: string;
  deleteTaskConfirm: string;

  // Priority
  priority: string;
  low: string;
  medium: string;
  high: string;
  urgent: string;

  // Recurrence
  repeat: string;
  doesNotRepeat: string;
  daily: string;
  weekly: string;
  monthly: string;
  recurring: string;

  // Task Modal
  newTask: string;
  editTask: string;
  taskTitle: string;
  taskTitlePlaceholder: string;
  descriptionNotes: string;
  descriptionPlaceholder: string;
  assignTo: string;
  dueDateTime: string;
  createTask: string;
  saveChanges: string;
  saving: string;

  // Group Modal
  groupTitle: string;
  editGroupName: string;
  editUserName: string;
  groupNamePlaceholder: string;
  membersConnected: string;
  familyInviteCode: string;
  newCode: string;
  copyCode: string;
  copyShareLink: string;
  linkCopied: string;
  members: string;
  joinAnotherGroup: string;
  enterCodePlaceholder: string;
  join: string;
  joining: string;

  // iOS Install Modal
  installOnIphone: string;
  iosPushNotice: string;
  iosExplanation: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;

  // Android Banner
  installTickApp: string;
  installAppDesc: string;

  // Auth Screen
  logIn: string;
  signUp: string;
  welcomeBack: string;
  welcomeBackDesc: string;
  createAccount: string;
  createAccountDesc: string;
  yourName: string;
  namePlaceholder: string;
  emailAddress: string;
  password: string;
  passwordPlaceholder: string;
  groupNameOptional: string;
  groupNameSignupPlaceholder: string;
  inviteCodeOptional: string;
  inviteCodePlaceholder: string;
  continueWithGoogle: string;
  dontHaveAccount: string;
  alreadyHaveAccount: string;
  orDivider: string;
  edgeD1: string;
  webPush: string;
  offlinePwa: string;

  // Empty State
  allCaughtUp: string;
  allCaughtUpDesc: string;
  noCompletedTasks: string;
  noCompletedDesc: string;
  createFirstTask: string;

  // Toasts
  toastPushEnabled: string;
  toastTestPushSent: string;
  toastNoActiveSubs: string;
  toastUnsubscribed: string;
  toastTaskCreated: string;
  toastTaskUpdated: string;
  toastTaskDeleted: string;
  toastTaskCompleted: string;
  toastTaskCompletedRecurring: string;
  toastNudgeSent: string;
  toastNudgeNoSubs: string;
  toastSignedIn: string;
  toastDemoSignedIn: string;
  toastBackOnline: string;
  toastWorkingOffline: string;
  toastCodeCopied: string;
  toastLinkCopied: string;
  toastJoinedGroup: string;
  toastGroupNameUpdated: string;
  toastUserNameUpdated: string;
}

export const dictionaries: Record<Language, Translations> = {
  en: {
    appName: 'Tick',
    appTagline: 'Organize, assign, and get things done together',
    online: 'Online',
    offline: 'Offline',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    install: 'Install',
    dismiss: 'Dismiss',
    loading: 'Loading...',
    gotIt: 'Got it!',
    you: 'You',
    anyone: 'Anyone',
    everyone: 'Everyone',
    unassigned: 'Unassigned',

    pushOn: 'Push On',
    enablePush: 'Enable Push',
    pushActiveNotice: 'Push Notifications Active',
    sendTestNotification: 'Send Test Notification',
    turnOffNotifications: 'Turn Off Notifications',
    signOut: 'Sign Out',
    switchLanguage: 'עברית',

    mom: 'Mom',
    dad: 'Dad',
    teen: 'Leo',
    sarahMom: 'Sarah (Mom)',
    alexDad: 'Alex (Dad)',
    leoTeen: 'Leo (Teen)',
    adminRole: 'Admin',
    memberRole: 'Member',

    allOpen: 'All Open',
    mine: 'Mine',
    dueSoon: 'Due Soon',
    completed: 'Completed',
    filterBy: 'Filter by:',

    nudge: 'Nudge',
    nudged: 'Nudged! 🔔',
    todayAt: 'Today at {time}',
    overdue: 'Overdue',
    deleteTaskConfirm: 'Are you sure you want to delete this task?',

    priority: 'Priority',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',

    repeat: 'Repeat',
    doesNotRepeat: 'Does not repeat',
    daily: 'Every Day',
    weekly: 'Every Week',
    monthly: 'Every Month',
    recurring: 'Recurring',

    newTask: 'New Task',
    editTask: 'Edit Chore / Task',
    taskTitle: 'Task Title *',
    taskTitlePlaceholder: 'e.g. Empty dishwasher, Take out trash, Math homework',
    descriptionNotes: 'Description / Notes',
    descriptionPlaceholder: 'Any details or specific instructions...',
    assignTo: 'Assign To',
    dueDateTime: 'Due Date & Time',
    createTask: 'Create Task',
    saveChanges: 'Save Changes',
    saving: 'Saving...',

    groupTitle: 'Group Members',
    editGroupName: 'Edit Group Name',
    editUserName: 'Edit your name',
    groupNamePlaceholder: 'Group name',
    membersConnected: '{count} members connected',
    familyInviteCode: 'Invite Code',
    newCode: 'New Code',
    copyCode: 'Copy Code',
    copyShareLink: 'Copy Shareable Link',
    linkCopied: 'Link Copied!',
    members: 'Members',
    joinAnotherGroup: 'Join Another Group',
    enterCodePlaceholder: 'Enter 6-char code',
    join: 'Join',
    joining: 'Joining...',

    installOnIphone: 'Install Tick on iPhone',
    iosPushNotice: 'Required for Push Notifications on iOS',
    iosExplanation: 'Apple iOS requires adding Tick to your Home Screen before task reminder notifications can be enabled.',
    step1Title: 'Tap the Share button',
    step1Desc: 'Located at the bottom bar of Safari',
    step2Title: 'Select Add to Home Screen',
    step2Desc: 'Scroll down in the share sheet options',
    step3Title: 'Launch Tick from your Home Screen',
    step3Desc: 'Tap "Enable Notifications" when prompted to receive instant chore reminders!',

    installTickApp: 'Install Tick App',
    installAppDesc: 'Get native push reminders & instant offline access',

    logIn: 'Log In',
    signUp: 'Sign Up',
    welcomeBack: 'Welcome Back',
    welcomeBackDesc: 'Sign in to access your task board',
    createAccount: 'Create Account',
    createAccountDesc: 'Get started with your group task manager',
    yourName: 'Your Name *',
    namePlaceholder: 'e.g. Sarah Miller',
    emailAddress: 'Email Address *',
    password: 'Password *',
    passwordPlaceholder: 'At least 6 characters',
    groupNameOptional: 'Group Name (optional)',
    groupNameSignupPlaceholder: 'e.g. The Millers, Roommates, Team',
    inviteCodeOptional: 'Invite Code (optional)',
    inviteCodePlaceholder: 'Enter 6-char code if joining an existing group',
    continueWithGoogle: 'Continue with Google',
    dontHaveAccount: "Don't have an account?",
    alreadyHaveAccount: 'Already have an account?',
    orDivider: 'or',
    edgeD1: 'Cloudflare D1',
    webPush: 'Web Push',
    offlinePwa: 'Offline PWA',

    allCaughtUp: 'All caught up! 🎉',
    allCaughtUpDesc: 'Great job! Everything for this filter is done.',
    noCompletedTasks: 'No completed tasks yet',
    noCompletedDesc: 'Completed chores will show up here.',
    createFirstTask: 'Create a task',

    toastPushEnabled: 'Push notifications enabled successfully! 🔔',
    toastTestPushSent: 'Test notification dispatched! Check your screen. 🎉',
    toastNoActiveSubs: 'No active subscriptions could be reached.',
    toastUnsubscribed: 'Unsubscribed from push notifications.',
    toastTaskCreated: 'Task created! 📋',
    toastTaskUpdated: 'Task updated!',
    toastTaskDeleted: 'Task deleted',
    toastTaskCompleted: 'Task marked completed! 🎉',
    toastTaskCompletedRecurring: 'Task completed! Scheduled next recurrence 🔁',
    toastNudgeSent: 'Push reminder sent to {name}! 🔔',
    toastNudgeNoSubs: 'Nudge recorded (no active devices registered for {name}).',
    toastSignedIn: 'Signed in successfully!',
    toastDemoSignedIn: 'Signed in as {name}!',
    toastBackOnline: 'You are back online!',
    toastWorkingOffline: 'Working offline. Local changes will be saved.',
    toastCodeCopied: 'Invite code copied to clipboard!',
    toastLinkCopied: 'Shareable invite link copied!',
    toastJoinedGroup: 'Successfully joined group! 👥',
    toastGroupNameUpdated: 'Group name updated! 👥',
    toastUserNameUpdated: 'Your name has been updated! 👤',
  },

  he: {
    appName: 'הקרציה',
    appTagline: 'מארגנים, מחלקים ומבצעים משימות יחד',
    online: 'מחובר',
    offline: 'לא מחובר',
    save: 'שמור',
    cancel: 'ביטול',
    delete: 'מחק',
    edit: 'ערוך',
    close: 'סגור',
    install: 'התקן',
    dismiss: 'התעלם',
    loading: 'טוען...',
    gotIt: 'הבנתי!',
    you: 'אתה',
    anyone: 'לכל אחד',
    everyone: 'כולם',
    unassigned: 'ללא שיוך',

    pushOn: 'התראות פעילות',
    enablePush: 'הפעל התראות',
    pushActiveNotice: 'התראות פוש פעילות',
    sendTestNotification: 'שלח התראת בדיקה',
    turnOffNotifications: 'כבה התראות',
    signOut: 'התנתק',
    switchLanguage: 'English',

    mom: 'אמא',
    dad: 'אבא',
    teen: 'ליאו',
    sarahMom: 'שרה (אמא)',
    alexDad: 'אלכס (אבא)',
    leoTeen: 'ליאו (נער)',
    adminRole: 'מנהל',
    memberRole: 'חבר',

    allOpen: 'כל הפתוחות',
    mine: 'שלי',
    dueSoon: 'בקרוב',
    completed: 'הושלמו',
    filterBy: 'סנן לפי:',

    nudge: 'נדנד',
    nudged: 'נשלחה תזכורת! 🔔',
    todayAt: 'היום ב-{time}',
    overdue: 'באיחור',
    deleteTaskConfirm: 'האם אתה בטוח שברצונך למחוק משימה זו?',

    priority: 'עדיפות',
    low: 'נמוכה',
    medium: 'בינונית',
    high: 'גבוהה',
    urgent: 'דחופה',

    repeat: 'חזרה',
    doesNotRepeat: 'ללא חזרה',
    daily: 'כל יום',
    weekly: 'כל שבוע',
    monthly: 'כל חודש',
    recurring: 'חוזרת',

    newTask: 'משימה משפחתית חדשה',
    editTask: 'עריכת משימה',
    taskTitle: 'שם המשימה *',
    taskTitlePlaceholder: 'לדוגמה: לרוקן מדיח, להוריד זבל, שיעורי מתמטיקה',
    descriptionNotes: 'תיאור / הערות',
    descriptionPlaceholder: 'פרטים נוספים או הוראות ספציפיות...',
    assignTo: 'שיוך ל-',
    dueDateTime: 'תאריך ושעה לביצוע',
    createTask: 'צור משימה',
    saveChanges: 'שמור שינויים',
    saving: 'שומר...',

    groupTitle: 'חברי הקבוצה',
    editGroupName: 'עריכת שם הקבוצה',
    editUserName: 'עריכת שמך',
    groupNamePlaceholder: 'שם הקבוצה',
    membersConnected: '{count} חברים מחוברים',
    familyInviteCode: 'קוד הזמנה',
    newCode: 'קוד חדש',
    copyCode: 'העתק קוד',
    copyShareLink: 'העתק קישור להזמנה',
    linkCopied: 'הקישור הועתק!',
    members: 'חברים',
    joinAnotherGroup: 'הצטרף לקבוצה אחרת',
    enterCodePlaceholder: 'הזן קוד בן 6 תווים',
    join: 'הצטרף',
    joining: 'מצטרף...',

    installOnIphone: 'התקנת "הקרציה" באייפון',
    iosPushNotice: 'נדרש לקבלת התראות פוש ב-iOS',
    iosExplanation: 'מכשירי אפל דורשים הוספת האפליקציה למסך הבית על מנת לאפשר קבלת התראות פוש.',
    step1Title: 'לחצו על כפתור השיתוף',
    step1Desc: 'נמצא בסרגל התחתון של Safari בדפדפן',
    step2Title: 'בחרו "הוסף למסך הבית"',
    step2Desc: 'גללו למטה בתפריט האפשרויות ובחרו באייקון הפלוס',
    step3Title: 'פתחו את האפליקציה ממסך הבית',
    step3Desc: 'לחצו על "הפעל התראות" לקבלת תזכורות בזמן אמת!',

    installTickApp: 'התקנת אפליקציית "הקרציה"',
    installAppDesc: 'קבלו התראות פוש וגישה מהירה גם במצב לא מקוון',

    logIn: 'התחברות',
    signUp: 'הרשמה',
    welcomeBack: 'ברוכים השבים',
    welcomeBackDesc: 'התחברו כדי לצפות בלוח המשימות המשפחתי',
    createAccount: 'יצירת חשבון חדש',
    createAccountDesc: 'התחילו לנהל משימות קבוצתיות בקלות',
    yourName: 'שמך המלא *',
    namePlaceholder: 'לדוגמה: שרה ישראלי',
    emailAddress: 'כתובת אימייל *',
    password: 'סיסמה *',
    passwordPlaceholder: 'לפחות 6 תווים',
    groupNameOptional: 'שם הקבוצה (אופציונלי)',
    groupNameSignupPlaceholder: 'לדוגמה: משפחה, שותפים, צוות',
    inviteCodeOptional: 'קוד הזמנה משפחתי (אופציונלי)',
    inviteCodePlaceholder: 'הזן קוד בן 6 תווים להצטרפות למשפחה קיימת',
    continueWithGoogle: 'המשך באמצעות Google',
    dontHaveAccount: 'אין לך חשבון עדיין?',
    alreadyHaveAccount: 'כבר יש לך חשבון?',
    orDivider: 'או',
    edgeD1: 'מסד נתונים D1',
    webPush: 'התראות פוש',
    offlinePwa: 'אופליין מלא',

    allCaughtUp: 'הכל גמור! 🎉',
    allCaughtUpDesc: 'כל הכבוד! כל המשימות בסינון זה הושלמו.',
    noCompletedTasks: 'אין משימות שהושלמו עדיין',
    noCompletedDesc: 'משימות שתסיימו יופיעו כאן.',
    createFirstTask: 'צור משימה',

    toastPushEnabled: 'התראות פוש הופעלו בהצלחה! 🔔',
    toastTestPushSent: 'התראת בדיקה נשלחה! בדקו את המסך. 🎉',
    toastNoActiveSubs: 'לא נמצאו מכשירים רשומים פעילים.',
    toastUnsubscribed: 'בוטל הרישום להתראות.',
    toastTaskCreated: 'המשימה נוצרה! 📋',
    toastTaskUpdated: 'המשימה עודכנה!',
    toastTaskDeleted: 'המשימה נמחקה',
    toastTaskCompleted: 'המשימה סומנה כהושלמה! 🎉',
    toastTaskCompletedRecurring: 'המשימה הושלמה! המופע הבא תוזמן אוטומטית 🔁',
    toastNudgeSent: 'תזכורת נשלחה אל {name}! 🔔',
    toastNudgeNoSubs: 'התזכורת נרשמה (אין מכשירים פעילים עבור {name}).',
    toastSignedIn: 'התחברת בהצלחה!',
    toastDemoSignedIn: 'התחברת בתור {name}!',
    toastBackOnline: 'החיבור לאינטרנט חזר!',
    toastWorkingOffline: 'פועל במצב לא מקוון. השינויים יישמרו מקומית.',
    toastCodeCopied: 'קוד ההזמנה הועתק ללוח!',
    toastLinkCopied: 'קישור ההזמנה הועתק!',
    toastJoinedGroup: 'הצטרפת בהצלחה לקבוצה! 👥',
    toastGroupNameUpdated: 'שם הקבוצה עודכן בהצלחה! 👥',
    toastUserNameUpdated: 'שמך עודכן בהצלחה! 👤',
  },
};
