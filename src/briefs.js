// Content for each partner deck, taken from viasocket_partner_decks_final.md.
// A brief is plain data; deck.js turns any brief into the seven-slide deck.

// Apps confirmed in viaSocket's catalog. Anything else in a deck is flagged before sending.
export const CONFIRMED_APPS = [
  'Shopify', 'WooCommerce', 'HubSpot', 'Zoho CRM', 'Zoho Desk', 'Freshdesk', 'Zendesk',
  'Salesforce', 'Razorpay', 'Stripe', 'Google Sheets', 'Google Calendar', 'Gmail', 'Slack'
]

const SETUP_STEPS = [
  { h: 'Paste the prompt', b: "Copy viaSocket's setup prompt into Cursor, Claude Code or Codex in your project." },
  { h: 'Add credentials', b: 'Your coding agent asks for your org ID, project ID and secret. They stay in .env only.' },
  { h: 'It builds', b: 'The agent builds the connect flow, agent tools and triggers for your use case.' },
  { h: 'Real test call', b: 'It finishes by running a real call against a connected app.' }
]

export const PRESETS = {
  aisensy: {
    partner: { name: 'AiSensy', color: '#07CF65', domain: 'aisensy.com' },
    title: "Give AiSensy's AI agents the power to act",
    subtitle: 'Your UI, powered by viaSocket: native integrations and agent tools across 2,300+ apps, inside AiSensy',
    chips: ['2,300+ apps', 'Your branding', 'Live in ~15 min'],
    titleNotes: "Open with the core idea: AiSensy's AI Agent Builder can already understand customers. viaSocket lets it take action in the apps those customers already use.",
    problem: {
      title: 'Your agent can talk. Can it act?',
      asksHeading: 'What customers ask the agent',
      asks: [
        ['"Where\'s my order?"', 'Shopify / WooCommerce'],
        ['"Book a demo for Friday"', 'Google Calendar'],
        ['"Sign me up for updates"', 'Zoho / HubSpot / LeadSquared'],
        ['"I\'ve paid, send my invoice"', 'Razorpay / PayU']
      ],
      pathHeading: 'Often, the path today',
      path: 'AiSensy → Zapier / Pabbly → customer\'s apps',
      pains: ['Customers leave AiSensy to set it up', 'Another tool, another bill', 'Customers build and maintain flows', "The AI agent can't call them as tools"],
      notes: 'Many AiSensy customers connect their wider stack through third-party automation tools. That works for simple flows but sends customers outside AiSensy and leaves the new AI agent without tools it can call.'
    },
    mock: {
      type: 'chat', title: 'Campaign Agent', steps: ['Goal', 'Audience', 'Journey', 'Review'],
      headline: 'What should we get done today?',
      user: "Remind customers about tomorrow's appointments",
      agent: "To find them I need your Google Calendar. Connect it once and I'll pull tomorrow's bookings.",
      button: 'Connect Calendar', buttonNote: "Opens Google's own consent screen",
      powered: ['One Connect button, run by viaSocket', "Google's own consent screen", 'Tokens, mapping and events handled', 'Same connection works as a tool for the agent'],
      notes: "This is AiSensy's own Campaign Agent, re-drawn as an illustrative mock. When the agent needs an app the customer hasn't connected yet, it asks, and the Connect button runs viaSocket. AiSensy keeps its look and flow; the same connection can then be used by the agent as a tool. Where exactly the Connect moment sits is a suggestion for AiSensy's product team to shape."
    },
    flows: {
      title: 'How it works inside AiSensy',
      items: [
        { heading: 'Agent action: "Where\'s my order?"', steps: [['Customer asks', 'on WhatsApp', 'WhatsApp'], ['AiSensy AI agent', 'picks the tool', 'partner'], ['viaSocket', 'auth + mapping', 'viasocket'], ['Shopify', 'returns the status', 'Shopify']] },
        { heading: 'Event trigger: payment received', steps: [['Razorpay', 'payment captured', 'Razorpay'], ['viaSocket', 'catches the event', 'viasocket'], ['AiSensy', 'picks the template', 'partner'], ['Customer gets', 'a confirmation', null]] }
      ],
      notes: "Each AiSensy customer connects their own accounts once. viaSocket stores and refreshes their tokens and maps each app's data, so AiSensy's code and agent call every app the same way."
    },
    objections: {
      title: "Don't we already have this covered?",
      items: [
        { quote: '"We already have a few integrations, like Shopify."', answer: 'Keep them. viaSocket covers the rest.', bullets: ['Your native integrations stay exactly as they are', 'Add the apps your customers ask for next, with no new OAuth app or mapping to build'], chips: ['Freshdesk', 'Zendesk', 'Zoho Desk', 'Google Calendar', 'Salesforce', 'Gmail'] },
        { quote: '"Customers can just use an automation tool."', answer: 'Keep customers inside your product.', bullets: ['No leaving to set up flows elsewhere, no extra tool or bill', 'Your branding, your plans, and every action monitored', 'The same connections work as tools for your AI agent'], chips: [] }
      ],
      banner: "viaSocket adds to what you have. It doesn't replace it.",
      notes: 'Objection 1: agree, and position viaSocket as the apps their customers ask for next. Nothing they built gets replaced. Objection 2: yes they can, but that sends customers out of the product, adds another tool and bill, and leaves AiSensy with no branding, no visibility and no way to offer it in its own plans or to its AI agent. Keep the tone friendly and avoid naming other tools.'
    },
    gains: {
      title: 'What AiSensy gains',
      items: [
        ['Customers stay in AiSensy', 'Integrations live in your product, not in a third-party tool.'],
        ['A new plan lever', 'Package integrations and agent tools into higher tiers.'],
        ['More conversations', 'Order and payment triggers drive WhatsApp volume.'],
        ['Live in 15 minutes', 'One setup prompt. No OAuth apps or token refresh to build.']
      ],
      notes: 'The business case: retention, a new pricing lever, more message volume, and speed.'
    },
    setup: { steps: SETUP_STEPS, after: 'Then a short beta with real customers.', apps: ['Shopify', 'WooCommerce', 'Zoho CRM', 'HubSpot', 'LeadSquared', 'Razorpay', 'Google Sheets', 'Calendar'], notes: 'The setup is one prompt pasted into a coding agent. A working prototype is realistic in about 15 minutes; rolling it out to customers is a short beta after that.' }
  },

  bolna: {
    partner: { name: 'Bolna', color: '#2563EB', domain: 'bolna.ai' },
    title: "Give Bolna's voice agents tools for any app",
    subtitle: "Your UI, powered by viaSocket: ready-made, real-time tools and triggers for your customers' apps, inside Bolna",
    chips: ['Already in your docs', 'Your branding', 'Live in ~15 min'],
    titleNotes: "Open with the relationship: Bolna's docs already list viaSocket as a supported no-code integration. This proposal goes one level deeper, from a tutorial in the docs to ready-made tools inside the Bolna product.",
    problem: {
      title: 'Can your voice agent act mid-call?',
      asksHeading: 'What callers ask the agent',
      asks: [
        ['"Where\'s my order?"', 'Shopify / WooCommerce'],
        ['"What\'s the status of my ticket?"', 'Freshdesk / Zendesk'],
        ['"Please update my details"', 'HubSpot / Zoho CRM'],
        ['"Did my payment go through?"', 'Razorpay / Stripe']
      ],
      pathHeading: 'Often, the path today',
      path: 'Built-in tool → custom API call → own system',
      pains: ['Beyond calendar and transfer, customers build custom API calls', 'Each customer hosts the endpoint and handles auth', 'Every new app is another build to maintain', "After-the-call automations can't answer the caller"],
      notes: "Bolna's built-in tools cover calendar availability, booking and call transfer, and customers can add custom functions. For anything else the customer has to write and host a function and handle auth, or fall back to automations that run after the call."
    },
    mock: {
      type: 'tiles', title: 'Integrations', badge: 'New',
      headline: 'Connect your apps, then give your agents tools to use in calls',
      tiles: [['Shopify', 'Connected'], ['Freshdesk', 'Connect'], ['HubSpot', 'Connect'], ['Razorpay', 'Connect']],
      toolsHeading: 'Tools for "Support agent"',
      tools: [['Look up order', true], ['Check shipping', true], ['Create return', false]],
      toolsNote: 'You choose which tools each agent can use',
      powered: ['One Connect flow per customer, run by viaSocket', "Each app's own consent screen", 'Ready-made tools, no custom API call to write', 'Actions run in real time, mid-call'],
      notes: "An illustrative mock in the style of Bolna's own dashboard with one new page, Integrations. A customer connects their own Shopify once, then chooses which ready-made tools each agent can use in calls. Exact placement is for Bolna's product team to shape. Be ready to talk about how tool calls are kept fast during live conversations."
    },
    flows: {
      title: 'How it works inside Bolna',
      items: [
        { heading: 'In-call tool: "Where\'s my order?"', steps: [['Caller asks', 'on the phone', null], ['Bolna voice agent', 'picks the tool', 'partner'], ['viaSocket', 'auth + mapping', 'viasocket'], ['Shopify', 'returns the status', 'Shopify']] },
        { heading: 'Event trigger: new order to confirm', steps: [['Shopify', 'new order placed', 'Shopify'], ['viaSocket', 'catches the event', 'viasocket'], ['Bolna', 'starts the call', 'partner'], ['Customer', 'confirms by voice', null]] }
      ],
      notes: "Two directions. In the call, the agent picks a tool, viaSocket handles auth and data mapping, and the app answers in real time. Before the call, an event in a customer's app starts an outbound Bolna call."
    },
    objections: {
      title: "Don't we already have this covered?",
      items: [
        { quote: '"We already have calendar, transfer and custom API triggers."', answer: 'Keep them. viaSocket covers the rest.', bullets: ['Your built-in tools stay exactly as they are', 'Ready-made tools for the apps customers ask for, with no custom API call or OAuth to build'], chips: ['Shopify', 'Freshdesk', 'Zendesk', 'HubSpot', 'Zoho CRM', 'Razorpay'] },
        { quote: '"Customers can automate it after the call with a no-code tool."', answer: 'Act during the call, inside Bolna.', bullets: ['Callers get answers mid-call, not in a follow-up', 'No extra tool or bill, and it carries your branding and plans', 'Every action monitored in one place'], chips: [] }
      ],
      banner: "viaSocket adds to what you have. It doesn't replace it.",
      notes: "Objection 1: agree, and position viaSocket as ready-made tools instead of each customer writing a custom function. Objection 2: yes, and that stays useful, but it can't answer the caller mid-call. Bolna's docs already list viaSocket as a no-code option, so frame this as going deeper, not replacing it. Avoid naming other tools."
    },
    gains: {
      title: 'What Bolna gains',
      items: [
        ['Agents that resolve', 'Look up, update and confirm mid-call, not just answer.'],
        ['Customers stay in Bolna', 'Integrations live in your product, not outside it.'],
        ['More calls', "Events in customers' apps can start outbound calls."],
        ['A new plan lever', 'Package app tools into higher tiers.']
      ],
      notes: 'The business case: agents that finish the job, retention, more call volume from triggers, and a new pricing lever.'
    },
    setup: { steps: SETUP_STEPS, after: 'Then a short beta with real customers.', apps: ['Shopify', 'Freshdesk', 'Zendesk', 'HubSpot', 'Zoho CRM', 'Razorpay', 'Google Sheets', 'Slack'], notes: 'The setup is one prompt pasted into a coding agent. A working prototype is realistic in about 15 minutes; rolling it out to customers is a short beta after that.' }
  }
}

/** Generic brief for a new partner; the AI draft (see server.js) overrides these fields. */
export function templateBrief({ name, color = '#7C3AED', domain, product = 'product', agent = 'agents' }) {
  const base = structuredClone(PRESETS.aisensy)
  const swap = (s) => (typeof s === 'string' ? s.replaceAll('AiSensy', name).replaceAll('Bolna', name) : s)
  const walk = (v) => Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : swap(v)
  const brief = walk(base)
  brief.partner = { name, color, domain }
  brief.title = `Give ${name}'s ${agent} the power to act`
  brief.subtitle = `Your UI, powered by viaSocket: native integrations and agent tools across 2,300+ apps, inside ${name}`
  brief.titleNotes = `Tailor this opener to ${name}'s ${product}.`
  return brief
}

/** Apps named in a brief that are not confirmed in the catalog (needs a human check). */
export function unconfirmedApps(brief) {
  const used = new Set([...brief.setup.apps, ...brief.objections.items.flatMap((i) => i.chips)])
  return [...used].filter((a) => !CONFIRMED_APPS.includes(a) && a !== 'Calendar')
}
