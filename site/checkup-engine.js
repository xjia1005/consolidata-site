(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CheckupEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
const questions=[
  {
    "id": "buying_reason",
    "title": "What customer problem does your offer help with?",
    "explanation": "Example: a bicycle rack’s steel frame is a feature. Taking two bikes to the trail in a small car is a customer situation and buying reason. Which best describes your main offer?",
    "options": [
      {
        "value": "scene",
        "label": "We describe a specific buyer, situation and buying reason, supported by customer evidence."
      },
      {
        "value": "features",
        "label": "We mainly describe features or general benefits."
      },
      {
        "value": "assumed",
        "label": "We have a buying reason in mind, but it is still an assumption."
      },
      {
        "value": "unknown",
        "label": "I am not sure / I need to check."
      },
      {
        "value": "na",
        "label": "This does not apply to our current business."
      }
    ]
  },
  {
    "id": "customer_evidence",
    "title": "What do you know from actual customers?",
    "explanation": "Customer questions, scoped requests, purchase decisions and reasons for declining can help explain a buying reason. Views and likes show attention, but do not establish why someone buys.",
    "options": [
      {
        "value": "records",
        "label": "We keep specific customer conversations, requests or purchase reasons and use them in decisions."
      },
      {
        "value": "informal",
        "label": "We hear useful feedback, but it is scattered or mostly informal."
      },
      {
        "value": "assumptions",
        "label": "We mainly use internal opinions or attention such as views and likes."
      },
      {
        "value": "unknown",
        "label": "I am not sure / I need to check."
      },
      {
        "value": "na",
        "label": "This does not apply to our current business."
      }
    ]
  },
  {
    "id": "scene_library",
    "title": "Can you reuse what you learn about customer situations?",
    "explanation": "A scene library can be a simple document with customer type, situation, problem, buying reason and its source. It does not need special software.",
    "options": [
      {
        "value": "usable",
        "label": "We have a usable set of customer situations with sources, and update it as we learn."
      },
      {
        "value": "scattered",
        "label": "We have examples, but they live in messages, files or people’s memories."
      },
      {
        "value": "none",
        "label": "We have no shared record of customer situations."
      },
      {
        "value": "unknown",
        "label": "I am not sure / I need to check."
      },
      {
        "value": "na",
        "label": "This does not apply to our current business."
      }
    ]
  },
  {
    "id": "channels",
    "title": "What tells you a marketing channel is useful?",
    "explanation": "A channel might be referrals, email, search, an event or social media. A useful record follows attention through customer replies, qualified requests and orders when those stages apply.",
    "options": [
      {
        "value": "qualified",
        "label": "We connect channel activity to relevant customer replies, qualified requests or orders."
      },
      {
        "value": "attention",
        "label": "We mainly compare reach, clicks, views or other attention."
      },
      {
        "value": "untracked",
        "label": "We do not consistently record which channel led to a customer action."
      },
      {
        "value": "unknown",
        "label": "I am not sure / I need to check."
      },
      {
        "value": "na",
        "label": "This does not apply to our current business."
      }
    ]
  },
  {
    "id": "purchase_path",
    "title": "Is the next step clear from first interest to purchase?",
    "explanation": "For a service business this may include a reply, call, scoped proposal and agreed order. For a product it may include selection, checkout and confirmation.",
    "options": [
      {
        "value": "checked",
        "label": "We have checked the path, each next step is clear, and we record where people stop."
      },
      {
        "value": "partial",
        "label": "Parts work, but handoffs or the next action are unclear."
      },
      {
        "value": "unchecked",
        "label": "We have not mapped or checked the path a customer must follow."
      },
      {
        "value": "unknown",
        "label": "I am not sure / I need to check."
      },
      {
        "value": "na",
        "label": "This does not apply to our current business."
      }
    ]
  },
  {
    "id": "order_records",
    "title": "Can you connect marketing work to actual orders?",
    "explanation": "A simple order record can include the offer, customer, channel when known, date, value and status. A proposal or booked call is a different stage from an order or payment.",
    "options": [
      {
        "value": "connected",
        "label": "Our records distinguish inquiries, proposals, orders and payments, with the source when known."
      },
      {
        "value": "separate",
        "label": "Orders are recorded, but the connection to marketing is incomplete."
      },
      {
        "value": "absent",
        "label": "We do not have a usable shared order record."
      },
      {
        "value": "unknown",
        "label": "I am not sure / I need to check."
      },
      {
        "value": "na",
        "label": "This does not apply to our current business."
      }
    ]
  },
  {
    "id": "costs_refunds",
    "title": "What costs do you include when reviewing marketing?",
    "explanation": "Sales value alone does not show what is left after marketing, fulfillment, refunds and other relevant costs. Include costs that apply to your business; this checkup does not estimate profit.",
    "options": [
      {
        "value": "included",
        "label": "We review relevant marketing and delivery costs, cancellations and refunds alongside sales."
      },
      {
        "value": "partial",
        "label": "We track some costs, but important costs or refunds are separate."
      },
      {
        "value": "excluded",
        "label": "We mainly review sales value without the relevant costs."
      },
      {
        "value": "unknown",
        "label": "I am not sure / I need to check."
      },
      {
        "value": "na",
        "label": "This does not apply to our current business."
      }
    ]
  },
  {
    "id": "repeat_tests",
    "title": "Can you learn from one marketing test to the next?",
    "explanation": "A useful test states one question, a bounded change, an observation window and a decision. Keeping enough context consistent helps you interpret what happened.",
    "options": [
      {
        "value": "comparable",
        "label": "We record a question, bounded change, observation window, result and next decision."
      },
      {
        "value": "changing",
        "label": "We try changes, but several things change at once or results are not recorded."
      },
      {
        "value": "none",
        "label": "We do not run or review repeatable marketing tests."
      },
      {
        "value": "unknown",
        "label": "I am not sure / I need to check."
      },
      {
        "value": "na",
        "label": "This does not apply to our current business."
      }
    ]
  },
  {
    "id": "spend_rules",
    "title": "How do you decide whether to continue spending?",
    "explanation": "A decision rule can include a spending limit, evidence to watch, a review date and conditions to continue, change or stop. It can apply to time as well as money.",
    "options": [
      {
        "value": "defined",
        "label": "We set limits and evidence-based continue, change or stop rules before spending."
      },
      {
        "value": "informal",
        "label": "We have rough limits, but decisions depend mostly on judgment at the time."
      },
      {
        "value": "absent",
        "label": "We continue or stop without agreed limits or review rules."
      },
      {
        "value": "unknown",
        "label": "I am not sure / I need to check."
      },
      {
        "value": "na",
        "label": "This does not apply to our current business."
      }
    ]
  },
  {
    "id": "review_ownership",
    "title": "Who turns the review into the next decision?",
    "explanation": "A review needs an owner, a date and a record of the decision. A small team can use one named person; a separate tool or committee is optional.",
    "options": [
      {
        "value": "named",
        "label": "A named owner reviews evidence on agreed dates and records decisions and next actions."
      },
      {
        "value": "informal",
        "label": "Someone usually reviews it, but dates, decisions or follow-through are informal."
      },
      {
        "value": "absent",
        "label": "No one consistently owns the review and next action."
      },
      {
        "value": "unknown",
        "label": "I am not sure / I need to check."
      },
      {
        "value": "na",
        "label": "This does not apply to our current business."
      }
    ]
  }
];
function validateAnswers(answers,notes={}){if(!answers||typeof answers!=='object'||Array.isArray(answers))throw new TypeError('Choose one answer for every question.');if(!notes||typeof notes!=='object'||Array.isArray(notes))throw new TypeError('Notes must be text keyed by question.');if(Object.keys(answers).some(id=>!questions.some(q=>q.id===id))||Object.keys(notes).some(id=>!questions.some(q=>q.id===id)))throw new TypeError('An answer contains an unknown question.');questions.forEach(q=>{if(!q.options.some(o=>o.value===answers[q.id]))throw new TypeError('Choose a valid answer for: '+q.title);if(notes[q.id]!==undefined&&(typeof notes[q.id]!=='string'||notes[q.id].length>600))throw new TypeError('Each optional note must be 600 characters or fewer.');});return true;}
function coverage(answers,notes={}){validateAnswers(answers,notes);return {answered:questions.length,unknowns:questions.filter(q=>answers[q.id]==='unknown').length};}
return Object.freeze({questions,validateAnswers,coverage});});
