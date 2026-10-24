import { readFile } from 'node:fs/promises'

const TEMPLATE = readFile(new URL('./deck-template.html', import.meta.url), 'utf8')

const hex = (c) => c.replace('#', '').toUpperCase()
const mix = (c, to, t) => {
  const n = parseInt(hex(c), 16)
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (to - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase()
}

// The 5-slide animated deck from viaSocket_x_AiSensy_v3.md, as data. Every other partner's brief has this shape.
export const AISENSY_V3 = {
  partner: { name: 'AiSensy', color: '#07CF65', deep: '#0A5C33', tint: '#E3F8EC', domain: 'aisensy.com' },
  titleLines: ['Give AiSensy’s AI agents', 'the power to act'],
  subtitle: 'Native integrations and agent tools for 2,300+ apps, inside AiSensy.',
  problem: {
    title: 'Your agent can talk. Can it act?',
    asksHeading: 'What customers ask the agent',
    asks: [
      ['“Where’s my order?”', 'Shopify / WooCommerce'],
      ['“Book a demo for Friday”', 'Google Calendar'],
      ['“Sign me up for updates”', 'Zoho / HubSpot / LeadSquared'],
      ['“I’ve paid, send my invoice”', 'Razorpay / PayU']
    ],
    pathHeading: 'Often, the path today',
    detour: 'Zapier / Pabbly',
    destination: 'customer’s apps',
    caption: 'A detour outside AiSensy, and the agent can’t use any of it.'
  },
  demo: {
    product: 'Campaign Agent',
    steps: ['Goal', 'Audience', 'Journey', 'Review'],
    headline: 'What should we get done today?',
    goal: 'Remind customers about tomorrow’s appointments',
    next: 'Next · who gets it',
    askBold: 'To find them I need your Google Calendar.',
    askRest: 'Connect it once and I’ll pull tomorrow’s bookings.',
    button: 'Connect Calendar',
    connected: 'Connected',
    captionBefore: 'Opens Google’s own consent screen',
    captionAfter: 'Pulling tomorrow’s bookings…',
    powered: ['One Connect button, on Google’s own consent screen', 'Tokens, mapping and events handled', 'Same connection works as a tool for the agent']
  },
  trigger: {
    heading: 'It works the other way too: payment and order events start WhatsApp messages',
    nodes: [['Razorpay', 'payment', 'Razorpay'], ['viaSocket', 'catches the event', 'viasocket'], ['AiSensy', 'template', 'partner'], ['Customer', 'confirmation', 'WhatsApp']]
  },
  objections: [
    { quote: 'We already have a few integrations, like Shopify.', answer: 'Keep them. viaSocket covers the rest.', body: 'Add the apps your customers ask for next, without building each one.', chips: ['Freshdesk', 'Zendesk', 'Zoho Desk', 'Google Calendar', 'Salesforce', 'Gmail'] },
    { quote: 'Customers can just use an automation tool.', answer: 'Keep customers inside your product.', body: 'No extra tool or bill for them, and it’s yours to brand and package into your plans.', chips: [] }
  ],
  banner: 'viaSocket adds to what you have. It doesn’t replace it.',
  notes: [
    'Open with the core idea: AiSensy’s AI Agent Builder can already understand customers. viaSocket lets it take action in the apps those customers already use.',
    'Customers ask the agent for things that live in other apps. Today many AiSensy customers connect those apps through third-party automation tools: they leave AiSensy to set it up, pay for another tool, and the new AI agent still can’t call those apps as tools.',
    'AiSensy’s own Campaign Agent, re-drawn as an illustrative mock. When the agent needs an app the customer hasn’t connected, it asks, and the Connect button runs viaSocket: Google’s consent screen opens, the customer approves, and viaSocket stores and refreshes the token and maps the data. Click to show the reverse direction: a Razorpay payment or a new order triggers an AiSensy template, which drives WhatsApp volume. Where the Connect moment sits is for AiSensy’s product team to shape.',
    'Objection 1: agree, and position viaSocket as the apps their customers ask for next. Lead with the apps shown, not with a catalogue number. Objection 2: that path sends customers out of AiSensy and adds a tool and a bill; with viaSocket, integrations stay inside AiSensy, under its brand, and become something AiSensy can package into higher plans. Keep the tone friendly and avoid naming other tools.',
    'The setup is one prompt pasted into a coding agent. It asks for credentials, builds the connect flow, tools and triggers, and finishes with a real test call. A working prototype is realistic in about 15 minutes; rolling it out to customers is a short beta after that.'
  ]
}

/** A neutral brief for any partner, used when the AI draft is unavailable. */
export function genericBrief({ name, color, domain, description = '' }) {
  return {
    partner: { name, color, domain },
    titleLines: [`Give ${name}’s users`, 'the power to act'],
    subtitle: `Native integrations and agent tools for 2,300+ apps, inside ${name}.`,
    problem: {
      title: 'Your product can talk. Can it act?',
      asksHeading: `What ${name}’s customers ask for`,
      asks: [
        ['“Sync my new leads”', 'HubSpot / Zoho CRM'],
        ['“Log this in our sheet”', 'Google Sheets'],
        ['“Tell the team on Slack”', 'Slack'],
        ['“Did the payment go through?”', 'Razorpay / Stripe']
      ],
      pathHeading: 'Often, the path today',
      detour: 'a third-party automation tool',
      destination: 'customer’s apps',
      caption: `A detour outside ${name}, and none of it is yours.`
    },
    demo: {
      product: name,
      steps: ['Goal', 'Apps', 'Rules', 'Review'],
      headline: 'What should we get done today?',
      goal: 'Send every new signup to our CRM',
      next: 'Next · pick the app',
      askBold: 'To do that I need your HubSpot.',
      askRest: 'Connect it once and I’ll add each new signup.',
      button: 'Connect HubSpot',
      connected: 'Connected',
      captionBefore: 'Opens HubSpot’s own consent screen',
      captionAfter: 'Syncing new signups…',
      powered: ['One Connect button, on the app’s own consent screen', 'Tokens, mapping and events handled', 'Same connection works as a tool for your AI']
    },
    trigger: {
      heading: `It works the other way too: events in customers’ apps start actions in ${name}`,
      nodes: [['Stripe', 'payment', 'Stripe'], ['viaSocket', 'catches the event', 'viasocket'], [name, 'acts on it', 'partner'], ['Customer', 'gets updated', null]]
    },
    objections: [
      { quote: 'We already have a few integrations.', answer: 'Keep them. viaSocket covers the rest.', body: 'Add the apps your customers ask for next, without building each one.', chips: ['HubSpot', 'Salesforce', 'Google Sheets', 'Slack', 'Gmail', 'Zendesk'] },
      { quote: 'Customers can just use an automation tool.', answer: 'Keep customers inside your product.', body: 'No extra tool or bill for them, and it’s yours to brand and package into your plans.', chips: [] }
    ],
    banner: 'viaSocket adds to what you have. It doesn’t replace it.',
    notes: [
      `Open with the core idea for ${name}. ${description}`.trim(),
      'Customers ask for things that live in other apps; today they leave the product to wire them up.',
      `An illustrative mock of ${name}. When an app isn’t connected yet, the product asks and viaSocket runs the connect flow. Then show the reverse direction with the trigger strip.`,
      'Agree with objection 1 and position viaSocket as the next apps. For objection 2, stress staying inside the product, under its brand. Avoid naming other tools.',
      'One prompt in a coding agent; a working prototype in about 15 minutes, then a short beta.'
    ]
  }
}

export async function renderHtmlDeck(brief, assets) {
  const color = brief.partner.color
  const data = {
    ...brief,
    partner: { ...brief.partner, deep: brief.partner.deep ?? mix(color, 0, 0.55), tint: brief.partner.tint ?? mix(color, 255, 0.88) },
    assets: { partnerLogo: null, viasocketLogo: null, screenshot: null, brands: {}, ...assets }
  }
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  const title = `viaSocket × ${brief.partner.name}`.replace(/[<&]/g, '')
  return (await TEMPLATE).replace('/*__DATA__*/null', () => json).replace('__TITLE__', () => title)
}
