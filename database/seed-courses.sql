-- Five999 Training Dashboard default trainings
-- Import this after schema.sql.

insert into training_courses (id, courses, updated_at)
values (1, '[
  {
    "id": "rpu",
    "service": "United Kingdom Police Service",
    "division": "Roads Policing Unit",
    "icon": "RP",
    "title": "Roads Policing Unit",
    "tag": "Traffic specialist training",
    "summary": "Covers pursuit conduct, traffic stops, scene safety, and specialist road incident standards.",
    "imageUrl": "",
    "resourceUrl": "",
    "modules": [
      {
        "title": "Role Standards",
        "content": "Represent the unit with calm, clear radio work and proportionate decision-making.\nPrioritise public safety over the chase, the stop, or the arrest outcome.\nUse FMS notes to record the reason for deployment, evidence gathered, and final action.",
        "imageUrl": "",
        "resourceUrl": ""
      },
      {
        "title": "Traffic Stops",
        "content": "Choose a safe location before initiating a stop and keep emergency lighting visible.\nExplain the reason for the stop clearly before requesting documents or checks.\nEscalate only when risk markers, behaviour, or intelligence justify it.",
        "imageUrl": "",
        "resourceUrl": ""
      },
      {
        "title": "Pursuits",
        "content": "Call direction, speed, traffic, weather, and risk changes as the pursuit develops.\nRequest authority and specialist assets early where policy requires it.\nDiscontinue when the risk to the public outweighs the policing purpose.",
        "imageUrl": "",
        "resourceUrl": ""
      }
    ],
    "quiz": [
      {
        "question": "What should be prioritised during any Roads Policing deployment?",
        "answers": [
          "A quick arrest",
          "Public safety",
          "Winning the pursuit",
          "Avoiding paperwork"
        ],
        "correct": 1
      },
      {
        "question": "What should be included in pursuit commentary?",
        "answers": [
          "Only the vehicle colour",
          "Direction, speed, traffic, weather, and risk",
          "Personal opinions",
          "Nothing unless asked"
        ],
        "correct": 1
      },
      {
        "question": "When should a pursuit be discontinued?",
        "answers": [
          "Never",
          "Only after fuel runs out",
          "When public risk outweighs the policing purpose",
          "When the suspect turns left"
        ],
        "correct": 2
      },
      {
        "question": "Before initiating a traffic stop, what should you consider?",
        "answers": [
          "A safe stopping location",
          "The nearest shop",
          "A faster vehicle",
          "A different uniform"
        ],
        "correct": 0
      },
      {
        "question": "Where should key actions and evidence be recorded?",
        "answers": [
          "In FMS notes",
          "In chat only",
          "Nowhere",
          "On a private notepad only"
        ],
        "correct": 0
      }
    ]
  },
  {
    "id": "ambulance-clinical-response",
    "service": "United Kingdom Ambulance Service",
    "division": "Clinical Response",
    "icon": "AM",
    "title": "Clinical Response Basics",
    "tag": "Ambulance specialist training",
    "summary": "Covers scene safety, patient assessment, handovers, and clinical escalation standards.",
    "imageUrl": "",
    "resourceUrl": "",
    "modules": [
      {
        "title": "Scene Safety",
        "content": "Assess hazards before approaching the patient.\nRequest police, fire, or highways support where the scene is unsafe.\nKeep clear communication with control throughout the response.",
        "imageUrl": "",
        "resourceUrl": ""
      },
      {
        "title": "Patient Handover",
        "content": "Use a structured handover with symptoms, observations, treatment, and risk.\nRecord decisions and patient status clearly in FMS.\nEscalate when the patient''s condition changes.",
        "imageUrl": "",
        "resourceUrl": ""
      }
    ],
    "quiz": [
      {
        "question": "What should be assessed before approaching a patient?",
        "answers": [
          "Scene hazards",
          "Vehicle colour",
          "Uniform style",
          "Fuel level"
        ],
        "correct": 0
      },
      {
        "question": "What should a handover include?",
        "answers": [
          "Symptoms, observations, treatment, and risk",
          "Only the location",
          "No details",
          "Only a name"
        ],
        "correct": 0
      }
    ]
  },
  {
    "id": "fire-incident-command",
    "service": "United Kingdom Fire and Rescue Service",
    "division": "Incident Command",
    "icon": "FR",
    "title": "Incident Command Basics",
    "tag": "Fire and rescue training",
    "summary": "Covers command structure, hazard control, cordons, and multi-agency work.",
    "imageUrl": "",
    "resourceUrl": "",
    "modules": [
      {
        "title": "Command Priorities",
        "content": "Identify life risk, hazards, and available resources.\nSet clear cordons and communicate the plan.\nCoordinate with police, ambulance, and specialist agencies.",
        "imageUrl": "",
        "resourceUrl": ""
      }
    ],
    "quiz": [
      {
        "question": "What should incident command identify first?",
        "answers": [
          "Life risk and hazards",
          "The newest vehicle",
          "Who arrived last",
          "A public chat message"
        ],
        "correct": 0
      }
    ]
  },
  {
    "id": "sar-search-planning",
    "service": "UK Search & Rescue",
    "division": "Search Planning",
    "icon": "SR",
    "title": "Search Planning Basics",
    "tag": "Search and rescue training",
    "summary": "Covers missing person risk, search areas, communications, and recovery planning.",
    "imageUrl": "",
    "resourceUrl": "",
    "modules": [
      {
        "title": "Search Areas",
        "content": "Build search areas from last known point, risk, terrain, and available teams.\nRecord searched locations and findings.\nEscalate when conditions or risk change.",
        "imageUrl": "",
        "resourceUrl": ""
      }
    ],
    "quiz": [
      {
        "question": "What should search areas be based on?",
        "answers": [
          "Last known point, risk, terrain, and teams",
          "Random selection",
          "Only roads",
          "Only weather"
        ],
        "correct": 0
      }
    ]
  },
  {
    "id": "highways-traffic-management",
    "service": "UK Highways",
    "division": "Traffic Management",
    "icon": "HW",
    "title": "Traffic Management Basics",
    "tag": "Highways training",
    "summary": "Covers lane closures, scene protection, signage, and incident support.",
    "imageUrl": "",
    "resourceUrl": "",
    "modules": [
      {
        "title": "Scene Protection",
        "content": "Use vehicles and signage to protect responders and road users.\nCoordinate lane closures with police and control.\nReview traffic flow and update closures as risk changes.",
        "imageUrl": "",
        "resourceUrl": ""
      }
    ],
    "quiz": [
      {
        "question": "What is the purpose of traffic management?",
        "answers": [
          "Protect responders and road users",
          "Block all roads permanently",
          "Avoid communication",
          "Ignore risk"
        ],
        "correct": 0
      }
    ]
  },
  {
    "id": "ntp-rail-response",
    "service": "National Transport Police",
    "division": "Rail Response",
    "icon": "NT",
    "title": "Rail Response Basics",
    "tag": "Transport policing training",
    "summary": "Covers railway incident safety, public order, evidence, and partner coordination.",
    "imageUrl": "",
    "resourceUrl": "",
    "modules": [
      {
        "title": "Rail Safety",
        "content": "Confirm track safety before entering railway environments.\nCoordinate with control and partner agencies.\nRecord evidence and passenger safety decisions in FMS.",
        "imageUrl": "",
        "resourceUrl": ""
      }
    ],
    "quiz": [
      {
        "question": "What should happen before entering railway environments?",
        "answers": [
          "Confirm track safety",
          "Run ahead alone",
          "Ignore control",
          "Close the incident"
        ],
        "correct": 0
      }
    ]
  }
]'::jsonb, now())
on conflict (id) do update set
  courses = excluded.courses,
  updated_at = now();
