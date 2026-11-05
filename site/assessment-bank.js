// Public question data only; generated from the reviewed backend/questions.json.
// Generation input bytes SHA256: ea9effbeda4dc8e677307b69bae3b921b1ee4ad2f53b26a5995395db4a578c03
(function(root,factory){const bank=factory();if(typeof module==='object'&&module.exports)module.exports=bank;else root.AssessmentBank=bank;})(typeof globalThis!=='undefined'?globalThis:this,function(){return {
  "schema_version": "1.0",
  "core_question_ids": [
    "C01",
    "C02",
    "C03",
    "C04",
    "C05",
    "C06"
  ],
  "questions": [
    {
      "id": "C01",
      "prompt_en": "What growth decision do you need to make next, what outcome and deadline would make it useful, and what happens if the decision is delayed?",
      "answer_type": "text",
      "value_dimensions": [
        "outcome",
        "delay"
      ],
      "distinguishes": [
        "An unclear success target",
        "A defined decision with a measurable outcome and a real deadline"
      ],
      "why_it_matters_en": "A useful next step depends on the actual decision, consequence of waiting and available time.",
      "unknown_action_en": "Record the decision as provisional; clarify the outcome, deadline and consequence before recommending an intervention."
    },
    {
      "id": "C02",
      "prompt_en": "Name one product or service. Which specific customer uses it, in what situation, to solve what problem or complete what task? How do they handle that situation today?",
      "answer_type": "text",
      "value_dimensions": [
        "outcome",
        "effort"
      ],
      "distinguishes": [
        "A specific customer task or need",
        "A broad audience or a seller-defined feature list"
      ],
      "why_it_matters_en": "Your team needs a shared description of the customer, situation, problem and current alternative before choosing a message or channel.",
      "unknown_action_en": "Request one bounded example of an actual or intended customer's task; do not infer a job from product features alone."
    },
    {
      "id": "C03",
      "prompt_en": "Which actual customers repeatedly get useful results or pay for this product, and what evidence supports that account? Which comparable customers did not succeed or buy?",
      "answer_type": "text",
      "value_dimensions": [
        "outcome",
        "likelihood"
      ],
      "distinguishes": [
        "Repeated customer value and payment in a defined group",
        "Interest, funding or registration being treated as proof of fit"
      ],
      "why_it_matters_en": "Successful customers can suggest a useful starting group. Include stalled, lost or unsuitable cases so the account is not based only on survivors.",
      "unknown_action_en": "Keep fit as a self-reported hypothesis. Seek permitted examples from successful and stalled or lost customers, with the group and time period recorded."
    },
    {
      "id": "C04",
      "prompt_en": "Where are you seeing growth fall short? Select all that apply, including any area you are unsure about.",
      "answer_type": "multi_select",
      "options": [
        {
          "value": "reach",
          "label_en": "Too few suitable potential customers encounter us.",
          "route_to": [
            "reach"
          ]
        },
        {
          "value": "response",
          "label_en": "Suitable people encounter us but do not take the next step.",
          "route_to": [
            "response"
          ]
        },
        {
          "value": "first_value",
          "label_en": "People start or sign up but do not complete a useful first task.",
          "route_to": [
            "first_value"
          ]
        },
        {
          "value": "purchase",
          "label_en": "People show interest or obtain value but do not buy or choose a suitable plan.",
          "route_to": [
            "purchase"
          ]
        },
        {
          "value": "retention",
          "label_en": "Customers stop, reduce use or spend, or do not renew or expand as expected.",
          "route_to": [
            "retention"
          ]
        },
        {
          "value": "other",
          "label_en": "Another situation, or our process works differently.",
          "route_to": [
            "evidence"
          ]
        },
        {
          "value": "unknown",
          "label_en": "We do not yet know where the shortfall occurs.",
          "route_to": [
            "evidence"
          ]
        }
      ],
      "value_dimensions": [],
      "distinguishes": [
        "A reported symptom in one customer-process stage",
        "Several interacting symptoms or insufficient information"
      ],
      "why_it_matters_en": "This selects which questions to explore; it does not diagnose a cause.",
      "unknown_action_en": "Include the evidence branch and retain any other symptoms already reported."
    },
    {
      "id": "C05",
      "prompt_en": "What changed, for which customer group and period, compared with what expectation or earlier period? What is that expectation based on?",
      "answer_type": "text",
      "value_dimensions": [],
      "distinguishes": [
        "A real change within a comparable group and period",
        "A changed definition, mix, denominator or expectation"
      ],
      "why_it_matters_en": "A company's overall totals can hide different patterns across products, channels, customer groups and time.",
      "unknown_action_en": "Record the reported shortfall without treating it as a measured trend; define the group, period, denominator and comparison first. Preserve an aspirational target as a target rather than as evidence of an achievable forecast."
    },
    {
      "id": "C06",
      "prompt_en": "Which existing evidence can you review for this decision without sharing personal customer details?",
      "answer_type": "multi_select",
      "options": [
        {
          "value": "self_report",
          "label_en": "Our current description or recollection."
        },
        {
          "value": "funnel_records",
          "label_en": "Aggregated visits, actions, sales or conversion records."
        },
        {
          "value": "usage_records",
          "label_en": "Aggregated task completion or product usage records."
        },
        {
          "value": "commercial_records",
          "label_en": "Aggregated payments, refunds, renewals or delivery costs."
        },
        {
          "value": "customer_accounts",
          "label_en": "Customer interview, support or cancellation notes we are permitted to use."
        },
        {
          "value": "observed_task",
          "label_en": "A permitted direct observation or recording of a real task."
        },
        {
          "value": "prior_tests",
          "label_en": "A documented earlier comparison or test."
        },
        {
          "value": "unknown",
          "label_en": "We cannot yet identify or access the needed evidence.",
          "route_to": [
            "evidence"
          ]
        }
      ],
      "value_dimensions": [],
      "distinguishes": [
        "An explanation supported by relevant records or direct observation",
        "An explanation based mainly on recollection or missing information"
      ],
      "why_it_matters_en": "Evidence quality determines how far the assessment can go and what should be checked next.",
      "unknown_action_en": "Use the evidence branch and ask for a minimal, permitted aggregate or example rather than a full customer export."
    },
    {
      "id": "R01",
      "prompt_en": "Who was the last completed campaign intended to reach, in what situation, and what evidence describes the people it actually reached?",
      "answer_type": "text",
      "value_dimensions": [
        "outcome"
      ],
      "distinguishes": [
        "The intended customer group was reached",
        "Most exposure came from a different group"
      ],
      "why_it_matters_en": "A large audience may still contain few people who face the relevant job or can participate in the buying decision.",
      "unknown_action_en": "Keep audience quality unknown; seek a permitted aggregate or a few relevant examples of actual recipients or respondents."
    },
    {
      "id": "R02",
      "prompt_en": "What records show how many distinct suitable people or companies encountered that campaign, how often, and over what period? What remains unknown about that coverage?",
      "answer_type": "text",
      "value_dimensions": [],
      "distinguishes": [
        "Limited coverage of suitable customers",
        "Content output or repeated impressions being mistaken for distinct suitable customers reached"
      ],
      "why_it_matters_en": "Total impressions, website visits and repeated exposure are different from distinct suitable customers. Low exposure can leave a comparison unresolved.",
      "unknown_action_en": "Report the available counts and their limits separately; do not convert total views into qualified reach."
    },
    {
      "id": "R03",
      "prompt_en": "Where do these customers seek help, discuss this problem or compare solutions, and how do you know?",
      "answer_type": "text",
      "value_dimensions": [],
      "distinguishes": [
        "A channel is used for this relevant customer decision",
        "A channel is selected mainly because the audience is present or the team is familiar with it"
      ],
      "why_it_matters_en": "Presence on a platform does not establish attention to this job or willingness to consider an offer there.",
      "unknown_action_en": "Use bounded interviews or a permitted source review to learn about actual information-seeking and buying behavior."
    },
    {
      "id": "R04",
      "prompt_en": "What did this campaign ask a suitable customer to understand and do next, and what evidence shows whether that happened?",
      "answer_type": "text",
      "value_dimensions": [
        "outcome",
        "likelihood",
        "delay",
        "effort"
      ],
      "distinguishes": [
        "Customers saw a relevant, credible next step",
        "Customers encountered unclear value, weak proof or a difficult next step"
      ],
      "why_it_matters_en": "A reach shortfall can coexist with message or next-step friction.",
      "unknown_action_en": "Preserve one approved message and its intended next step; use a comprehension or path check before concluding that more volume is the answer."
    },
    {
      "id": "S01",
      "prompt_en": "For one customer in that situation, what single benefit or buying reason does a representative message make clear, and what does it ask them to do next?",
      "answer_type": "text",
      "value_dimensions": [
        "outcome"
      ],
      "distinguishes": [
        "A focused customer result is clear",
        "Several features or audiences obscure the main result"
      ],
      "why_it_matters_en": "A focused message gives the intended customer a reason to recognize the situation and take one relevant next step.",
      "unknown_action_en": "Review one approved message or public example; mark the customer's interpretation unknown until it is checked."
    },
    {
      "id": "S02",
      "prompt_en": "What have suitable customers said they understood from that message, in their own words?",
      "answer_type": "text",
      "value_dimensions": [
        "outcome",
        "likelihood"
      ],
      "distinguishes": [
        "Suitable customers understand the intended value",
        "The team assumes understanding without observing it"
      ],
      "why_it_matters_en": "This helps distinguish a weak buying reason from a message that failed to communicate it.",
      "unknown_action_en": "Run a small permitted comprehension check; ask for an unprompted explanation rather than agreement with the message."
    },
    {
      "id": "S03",
      "prompt_en": "What proof and unresolved concerns do suitable customers encounter before taking the next step?",
      "answer_type": "text",
      "value_dimensions": [
        "likelihood"
      ],
      "distinguishes": [
        "The desired result is understood but not yet credible",
        "The result is credible but another constraint is blocking action"
      ],
      "why_it_matters_en": "A customer can recognize a problem and still doubt that this offer will help in their situation.",
      "unknown_action_en": "Record trust and applicability as open questions; seek actual objections or task evidence without inventing testimonials or success claims."
    },
    {
      "id": "S04",
      "prompt_en": "What must an interested customer do before the next useful conversation, trial or purchase can begin?",
      "answer_type": "text",
      "value_dimensions": [
        "delay",
        "effort"
      ],
      "distinguishes": [
        "The next step is easy to find and complete",
        "Waiting, forms, configuration, unclear terms or handoffs interrupt progress"
      ],
      "why_it_matters_en": "The promised benefit and the burden of taking the next step both affect the customer's experience.",
      "unknown_action_en": "Walk through the permitted public path and record steps and waits; do not infer completion from a link or button existing."
    },
    {
      "id": "V01",
      "prompt_en": "What first completed task would show that a suitable customer has obtained useful value, and what have customers actually completed?",
      "answer_type": "text",
      "value_dimensions": [
        "outcome",
        "likelihood"
      ],
      "distinguishes": [
        "Customers complete a task tied to their desired result",
        "Registration or activity is being used as a substitute for useful value"
      ],
      "why_it_matters_en": "The first meaningful result needs an observable definition appropriate to this product.",
      "unknown_action_en": "Agree on one task and observable completion evidence before evaluating onboarding success."
    },
    {
      "id": "V02",
      "prompt_en": "What steps and elapsed time separate starting the product from completing that first useful task?",
      "answer_type": "text",
      "value_dimensions": [
        "delay",
        "effort"
      ],
      "distinguishes": [
        "Progress is fast and manageable for a suitable customer",
        "Setup, waiting, rework or coordination delay the first useful result"
      ],
      "why_it_matters_en": "This reveals where time and customer effort accumulate across the whole task.",
      "unknown_action_en": "Use one permitted task walkthrough or an aggregate task timeline; retain missing steps and timing as unknown."
    },
    {
      "id": "V03",
      "prompt_en": "How do the situations and workflows of customers who complete this task differ from those who stall?",
      "answer_type": "text",
      "value_dimensions": [
        "outcome",
        "likelihood",
        "effort"
      ],
      "distinguishes": [
        "A reusable success pattern exists within a comparable group",
        "Selection, special assistance or a different job explains the apparent success"
      ],
      "why_it_matters_en": "A success story proposes a mechanism; comparison cases help challenge it.",
      "unknown_action_en": "Select suitable success and stalled cases for permitted research; do not generalize from the largest spender or one exceptional customer."
    },
    {
      "id": "V04",
      "prompt_en": "Which inputs, permissions, integrations, skills or assistance must a customer supply to complete the task?",
      "answer_type": "text",
      "value_dimensions": [
        "likelihood",
        "delay",
        "effort"
      ],
      "distinguishes": [
        "The task fits the customer's available resources and workflow",
        "Required work or missing product capability prevents completion"
      ],
      "why_it_matters_en": "The useful intervention may require product, implementation or support work alongside marketing.",
      "unknown_action_en": "List the missing requirements; route product or specialist constraints to the responsible owner before promising more acquisition."
    },
    {
      "id": "P01",
      "prompt_en": "Which roles use the product, evaluate it, approve it and pay for it in this buying process?",
      "answer_type": "text",
      "value_dimensions": [
        "likelihood",
        "delay",
        "effort"
      ],
      "distinguishes": [
        "The right decision participants are involved",
        "Interest from users is being mistaken for purchase authority or an approved buying path"
      ],
      "why_it_matters_en": "A buying process can have several participants and dependencies.",
      "unknown_action_en": "Map roles without collecting names or contact details; confirm the process with an authorized customer-side owner."
    },
    {
      "id": "P02",
      "prompt_en": "What does the paid product or package help this customer achieve, including help before and after first use? What evidence shows that they value that benefit enough to pay?",
      "answer_type": "text",
      "value_dimensions": [
        "outcome",
        "likelihood"
      ],
      "distinguishes": [
        "A higher-priced package addresses a meaningful customer need",
        "More features or a higher price lack a relevant added result for this group"
      ],
      "why_it_matters_en": "A package can improve the whole customer task through a clearer result, credible proof, shorter delay and less effort. Those benefits still need evidence.",
      "unknown_action_en": "Keep package value as a hypothesis; use actual buying and usage accounts to test the proposed difference."
    },
    {
      "id": "P03",
      "prompt_en": "What alternatives did recent buyers and lost or delayed prospects consider, including existing tools or doing nothing? What reasons and behavior explain choosing, declining or postponing your offer?",
      "answer_type": "text",
      "value_dimensions": [
        "outcome",
        "likelihood"
      ],
      "distinguishes": [
        "The offer, price or risk is a relevant obstacle",
        "Timing, fit, authority or another explanation better matches the observed choice"
      ],
      "why_it_matters_en": "The buying reason must be understood against a real alternative. Include lost and postponed decisions as well as successful purchases.",
      "unknown_action_en": "Ask a recent buyer and a lost or delayed prospect what they compared and what happened. Do not infer an alternative from a competitor list alone."
    },
    {
      "id": "P04",
      "prompt_en": "What time, work, uncertainty or disruption must a customer accept between deciding to buy and beginning useful use?",
      "answer_type": "text",
      "value_dimensions": [
        "likelihood",
        "delay",
        "effort"
      ],
      "distinguishes": [
        "The purchase and transition fit the customer's needs",
        "Approval, migration, setup, contract steps or perceived risk block progress"
      ],
      "why_it_matters_en": "The total transition burden can matter even when the price and result are acceptable.",
      "unknown_action_en": "Map the known steps and identify one uncertain dependency to check with the responsible owner."
    },
    {
      "id": "T01",
      "prompt_en": "What valuable job do customers return to complete, and what evidence shows continued value after the initial purchase?",
      "answer_type": "text",
      "value_dimensions": [
        "outcome",
        "likelihood"
      ],
      "distinguishes": [
        "The job recurs and the product keeps helping",
        "Repeat activity is assumed, or the job ends without a reason for continued use"
      ],
      "why_it_matters_en": "Expected retention should match the customer's actual job and the product's commercial model.",
      "unknown_action_en": "Clarify the expected recurrence before labeling departure as a failure; seek relevant continued-use or repeat-purchase evidence."
    },
    {
      "id": "T02",
      "prompt_en": "Which comparable customer groups stayed, left, reduced spend or expanded, and when? How were those groups selected, and whose experience is missing?",
      "answer_type": "text",
      "value_dimensions": [],
      "distinguishes": [
        "A specific group or process stage accounts for the change",
        "Aggregate totals hide cohort, pricing, seasonal or customer-mix differences"
      ],
      "why_it_matters_en": "A few enthusiastic users can hide important failures or groups that were never reached. Coverage and selection affect what the pattern can support.",
      "unknown_action_en": "Choose a bounded comparable group and period; preserve missing definitions and sample limitations."
    },
    {
      "id": "T03",
      "prompt_en": "What do departing and continuing customers say about the results they expected and the results they experienced?",
      "answer_type": "text",
      "value_dimensions": [
        "outcome",
        "likelihood"
      ],
      "distinguishes": [
        "The offer's expectation differs from delivered value",
        "A changing job, alternative, customer fit or other factor explains continuation or departure"
      ],
      "why_it_matters_en": "Perceived likelihood before purchase and actual results after use need separate evidence.",
      "unknown_action_en": "Use permitted customer research and relevant task records; keep customer accounts, observed behavior and interpretation distinct."
    },
    {
      "id": "T04",
      "prompt_en": "What ongoing effort, waiting, support, rework or coordination does a customer need to keep obtaining value?",
      "answer_type": "text",
      "value_dimensions": [
        "delay",
        "effort"
      ],
      "distinguishes": [
        "Continued value is convenient to obtain",
        "Recurring burden or delivery problems undermine otherwise useful results"
      ],
      "why_it_matters_en": "A package can reduce one burden while creating another later in the customer's workflow.",
      "unknown_action_en": "Inspect one recurring task and its exceptions; involve the product, delivery or support owner when those steps are decisive."
    },
    {
      "id": "E01",
      "prompt_en": "How are the counts or rates defined? Are the customer group, exposure, observation window and comparison consistent, including any channel or format differences?",
      "answer_type": "text",
      "value_dimensions": [],
      "distinguishes": [
        "Comparable observations describe a real pattern",
        "Definitions, denominators, missing data or measurement changes create an apparent pattern"
      ],
      "why_it_matters_en": "Different audiences, exposure and time windows can explain apparent differences. Observational channel comparisons do not establish a causal winner.",
      "unknown_action_en": "Establish comparable definitions and relevant exposure first. Different channels or formats can be tested, but audience differences and uncertainty must remain visible."
    },
    {
      "id": "E02",
      "prompt_en": "Which statements are customer or team reports, which come from records, and which were directly observed?",
      "answer_type": "text",
      "value_dimensions": [],
      "distinguishes": [
        "Relevant records and observations support an interpretation",
        "A repeated account or inference has been mistaken for independent evidence"
      ],
      "why_it_matters_en": "Different source types support different levels of confidence.",
      "unknown_action_en": "Tag each material claim as self_report, record or observation with date and scope; preserve missing or conflicting evidence."
    },
    {
      "id": "E03",
      "prompt_en": "What observation or customer case would make you reconsider your current explanation, and how would you seek evidence that could challenge it?",
      "answer_type": "text",
      "value_dimensions": [
        "likelihood"
      ],
      "distinguishes": [
        "The explanation can be challenged by a discriminating observation",
        "The same result is being used to support every explanation"
      ],
      "why_it_matters_en": "A useful check can weaken a favored explanation as well as support it; only seeking successful cases can mislead the decision.",
      "unknown_action_en": "Retain at least two plausible explanations and specify what each would predict before selecting a check."
    },
    {
      "id": "E04",
      "prompt_en": "What is the smallest permitted next check that could change the decision? Who can authorize it, and what time, budget, relevant customer coverage and stop condition must be agreed?",
      "answer_type": "text",
      "value_dimensions": [
        "outcome",
        "likelihood",
        "delay",
        "effort"
      ],
      "distinguishes": [
        "A bounded check can reduce a relevant uncertainty",
        "An intervention is being proposed without access, capacity, consent or an interpretable result"
      ],
      "why_it_matters_en": "Choose a check with enough relevant evidence for its decision. A small budget or interview count does not by itself make the conclusion reliable.",
      "unknown_action_en": "Name the missing permission, resource or observation; recommend a human-owned evidence action rather than launching anything automatically."
    }
  ],
  "branches": {
    "reach": {
      "label_en": "Suitable customers may not be encountering the offer",
      "question_ids": [
        "R01",
        "R02",
        "R03",
        "R04"
      ],
      "competing_explanations": [
        "Coverage of the relevant group is limited.",
        "The channel reaches a different group or a different decision context.",
        "The message or next step is unclear despite actual exposure.",
        "The apparent shortfall reflects uncertain measurement."
      ],
      "evidence_actions": [
        "Review one permitted campaign, its intended group, actual exposure evidence and subsequent actions.",
        "Ask a bounded set of suitable customers where they actually sought help or compared alternatives; keep the sample limits explicit."
      ],
      "possible_handoffs": [
        "Marketing or channel research",
        "Positioning and message review",
        "Customer research",
        "Measurement owner"
      ]
    },
    "response": {
      "label_en": "People encounter the offer but do not take the next step",
      "question_ids": [
        "S01",
        "S02",
        "S03",
        "S04"
      ],
      "competing_explanations": [
        "The buying reason is not relevant to this group or situation.",
        "Customers do not understand the intended result.",
        "The result is understood but credibility, timing or transition burden prevents action.",
        "The audience or path differs from the campaign assumption."
      ],
      "evidence_actions": [
        "Review one approved message and observe how suitable customers explain it without prompting.",
        "Walk through the actual permitted next-step path and inspect relevant response evidence before choosing a message comparison."
      ],
      "possible_handoffs": [
        "Positioning and offer design",
        "Customer research",
        "Conversion-path owner",
        "Sales or customer-success owner"
      ]
    },
    "first_value": {
      "label_en": "Customers start but may not obtain a useful first result",
      "question_ids": [
        "V01",
        "V02",
        "V03",
        "V04"
      ],
      "competing_explanations": [
        "The initial task does not match this group's job.",
        "A useful task is blocked by setup, missing inputs or excessive customer effort.",
        "Product capability, reliability or delivery limits prevent completion.",
        "Success depends on special assistance or a different customer situation."
      ],
      "evidence_actions": [
        "Observe one permitted real task from preparation through first useful output, including waits, rework and handoffs.",
        "Compare a few suitable successful and stalled cases to identify and challenge a proposed workflow mechanism."
      ],
      "possible_handoffs": [
        "Product owner",
        "Implementation or onboarding owner",
        "Support or delivery owner",
        "Marketing for expectation and fit issues"
      ]
    },
    "purchase": {
      "label_en": "Interest or useful use does not become a suitable purchase",
      "question_ids": [
        "P01",
        "P02",
        "P03",
        "P04"
      ],
      "competing_explanations": [
        "The relevant buying participants or approval path are missing.",
        "The package does not add a result valued by this group.",
        "Credibility, price, transition burden or risk affects the decision.",
        "The customer has a different timing, job or alternative; the cause remains uncertain."
      ],
      "evidence_actions": [
        "Map decision roles and examine permitted accounts of completed, postponed and declined purchases.",
        "Compare the package promise with actual workflow requirements and the product's ability to deliver before considering a pricing or offer test."
      ],
      "possible_handoffs": [
        "Offer and positioning work",
        "Sales process owner",
        "Product or implementation owner",
        "Commercial owner for pricing economics"
      ]
    },
    "retention": {
      "label_en": "Continuation, renewals or expansion fall below expectation",
      "question_ids": [
        "T01",
        "T02",
        "T03",
        "T04"
      ],
      "competing_explanations": [
        "Promised or expected results are not being delivered for this group.",
        "Recurring customer effort or support burden outweighs the benefit.",
        "The job ends, changes or is better served by an alternative.",
        "A cohort, commercial model or measurement difference changes what retention should mean."
      ],
      "evidence_actions": [
        "Review a bounded comparable group of continuation, cancellation, downgrade and expansion events.",
        "Use permitted success and departure interviews with relevant task records; do not treat a story as proof of an intervention's effect."
      ],
      "possible_handoffs": [
        "Product owner",
        "Customer-success or support owner",
        "Delivery or operations owner",
        "Marketing for fit and expectation issues"
      ]
    },
    "evidence": {
      "label_en": "The relevant evidence or symptom location is unclear",
      "question_ids": [
        "E01",
        "E02",
        "E03",
        "E04"
      ],
      "competing_explanations": [
        "The current explanation has relevant support but needs a discriminating check.",
        "Measurement or access gaps prevent interpretation.",
        "Several interacting explanations remain plausible.",
        "The priority depends on a missing decision, resource or professional review."
      ],
      "evidence_actions": [
        "Define the smallest consistent group, time window and observation needed for the decision.",
        "Request a permitted aggregate, conduct a scoped task observation or propose a human-approved test; preserve unknowns until evidence is available."
      ],
      "possible_handoffs": [
        "Company decision owner",
        "Analytics or data owner",
        "Customer research",
        "Relevant product, delivery or qualified specialist owner"
      ]
    }
  },
  "value_dimensions": {
    "outcome": {
      "label_en": "Desired outcome",
      "review_question_en": "Does this step advance a result that matters to this customer in this situation?",
      "evidence_boundary": "Describe the expected benefit separately from any observed or delivered result."
    },
    "likelihood": {
      "label_en": "Belief that the result can be achieved",
      "review_question_en": "What relevant evidence makes this result credible for this customer?",
      "evidence_boundary": "Perceived confidence is not measured success probability; actual delivery and applicability require evidence."
    },
    "delay": {
      "label_en": "Time before useful progress",
      "review_question_en": "How long must the customer wait for a meaningful next result?",
      "evidence_boundary": "Separate stated expectations, measured elapsed time and uncertain dependencies."
    },
    "effort": {
      "label_en": "Customer effort and sacrifice",
      "review_question_en": "What work, cost, disruption, learning or coordination must the customer accept?",
      "evidence_boundary": "Review the full relevant task, including preparation, adoption, exceptions and continued use."
    }
  }
};});
