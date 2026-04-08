const LOGO_DATA_URL = "logo.jpeg";

const DEFAULT_DATA = {
  "eDistrict Kerala": {
    "_icon": "🏛️",
    "_color": "#059669",
    "_links": [
      {
        "name": "Open eDistrict Kerala",
        "url": "https://edistrict.kerala.gov.in/",
        "desc": "Open the main eDistrict Kerala portal directly.",
        "keywords": ["edistrict", "kerala edistrict", "certificate portal", "main portal"]
      }
    ],
    "Certificates": [
      {
        "name": "Income Certificate",
        "url": "https://edistrict.kerala.gov.in/",
        "desc": "Apply for income certificate through eDistrict.",
        "keywords": ["income certificate", "edistrict income", "annual income"]
      },
      {
        "name": "Community Certificate",
        "url": "https://edistrict.kerala.gov.in/",
        "desc": "Apply for caste and community certificates.",
        "keywords": ["community certificate", "caste certificate", "obc", "sc", "st"]
      },
      {
        "name": "Residence Certificate",
        "url": "https://edistrict.kerala.gov.in/",
        "desc": "Apply for residence certificate.",
        "keywords": ["residence certificate", "domicile", "address proof"]
      }
    ]
  },
  "KSMART": {
    "_icon": "🧩",
    "_color": "#e82c78",
    "_links": [
      {
        "name": "Open KSMART",
        "url": "https://ksmart.lsgkerala.gov.in/ui/home/citizen/login",
        "desc": "Open the KSMART citizen portal directly.",
        "keywords": ["ksmart", "local self government", "municipality", "citizen portal"]
      }
    ]
  },
  "Payments": {
    "_icon": "💳",
    "_color": "#2563eb",
    "_links": [
      {
        "name": "Pay Land Tax",
        "url": "https://revenue.kerala.gov.in/",
        "desc": "Pay land tax through the revenue portal.",
        "keywords": ["land tax", "revenue", "village office", "bhumi"]
      },
      {
        "name": "Pay Property Tax",
        "url": "https://ksmart.lsgkerala.gov.in/ui/property-tax/quick-pay-tax/citizen",
        "desc": "Pay local body property tax online.",
        "keywords": ["property tax", "building tax", "house tax"]
      },
      {
        "name": "KSEB Quick Pay",
        "url": "https://wss.kseb.in/selfservices/quickpay",
        "desc": "Pay KSEB bill without login using consumer number.",
        "keywords": ["kseb quick pay", "electricity bill", "consumer number"]
      },
      {
        "name": "Jalanidhi Water Bill",
        "url": "https://www.smpay.in/login.php",
        "desc": "Pay Jalanidhi water bill online.",
        "keywords": ["water bill", "jalanidhi", "smpay", "water payment"]
      },
      {
        "name": "Pravasi Welfare Quick Pay",
        "url": "https://register.pravasikerala.org/public/index.php/online/quick_pay",
        "desc": "Quick payment for Pravasi welfare schemes.",
        "keywords": ["pravasi", "welfare", "quick pay", "kshemanidhi"]
      }
    ]
  },
  "KSEB": {
    "_icon": "⚡",
    "_color": "#00235c",
    "_links": [
      {
        "name": "KSEB Self Care",
        "url": "https://wss.kseb.in/selfservices/wssloginUser.do",
        "desc": "Access KSEB self care services.",
        "keywords": ["kseb", "electricity", "self care", "connection"]
      }
    ]
  },
  "Ration Card Services": {
    "_icon": "🌾",
    "_color": "#dc2626",
    "_links": [
      {
        "name": "Ration Card Portal",
        "url": "https://ecitizen.civilsupplieskerala.gov.in/index.php/c_login",
        "desc": "Access Kerala ration card services.",
        "keywords": ["ration card", "civil supplies", "food card", "pds"]
      }
    ]
  },
  "Encumbrance": {
    "_icon": "📜",
    "_color": "#3b82f6",
    "_links": [
      {
        "name": "Encumbrance Certificate",
        "url": "https://pearl.registration.kerala.gov.in/index.php",
        "desc": "Registration department property encumbrance services.",
        "keywords": ["encumbrance certificate", "property ec", "registration", "pearl"]
      }
    ]
  },
  "Aadhaar": {
    "_icon": "🪪",
    "_color": "#3b82f6",
    "_links": [
      {
        "name": "Order PVC Aadhaar Card",
        "url": "https://myaadhaar.uidai.gov.in/",
        "desc": "Order PVC Aadhaar card online.",
        "keywords": ["pvc aadhaar", "uidai", "aadhaar pvc"]
      },
      {
        "name": "Download Aadhaar",
        "url": "https://myaadhaar.uidai.gov.in/genricDownloadAadhaar",
        "desc": "Download e-Aadhaar PDF.",
        "keywords": ["download aadhaar", "eaadhaar", "print aadhaar"]
      },
      {
        "name": "Check Aadhaar Validity",
        "url": "https://myaadhaar.uidai.gov.in/check-aadhaar-validity/en",
        "desc": "Check whether an Aadhaar number is valid.",
        "keywords": ["aadhaar validity", "uid validity", "verify aadhaar"]
      },
      {
        "name": "Update Aadhaar",
        "url": "https://myaadhaar.uidai.gov.in/",
        "desc": "Update name, address, date of birth and mobile details.",
        "keywords": ["aadhaar update", "address change", "name correction", "uidai"]
      }
    ]
  },
  "Passport": {
    "_icon": "🛂",
    "_color": "#1d4ed8",
    "_links": [
      {
        "name": "New / Reissue Passport",
        "url": "https://www.passportindia.gov.in/psp/Apply",
        "desc": "Apply for a fresh passport or reissue an existing one.",
        "keywords": ["passport apply", "reissue passport", "passport india"]
      }
    ]
  },
  "PAN Card": {
    "_icon": "💼",
    "_color": "#003180",
    "_links": [
      {
        "name": "Link PAN with Aadhaar",
        "url": "https://eportal.incometax.gov.in/iec/foservices/#/pre-login/bl-link-aadhaar-landing",
        "desc": "Link PAN card with Aadhaar and check status.",
        "keywords": ["link pan aadhaar", "pan status", "income tax portal"]
      }
    ],
    "NSDL / Protean": [
      {
        "name": "New PAN - NSDL",
        "url": "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html",
        "desc": "Apply for fresh PAN card via Protean / NSDL.",
        "keywords": ["new pan", "protean pan", "nsdl pan", "form 49a"]
      },
      {
        "name": "PAN Correction - NSDL",
        "url": "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html",
        "desc": "Correct PAN details through Protean / NSDL.",
        "keywords": ["pan correction", "pan update", "nsdl correction"]
      },
      {
        "name": "PAN Reprint - NSDL",
        "url": "https://onlineservices.proteantech.in/paam/ReprintEPan.html",
        "desc": "Reprint PAN card through Protean.",
        "keywords": ["pan reprint", "duplicate pan", "epan"]
      }
    ],
    "UTIITSL": [
      {
        "name": "New PAN - UTIITSL",
        "url": "https://www.pan.utiitsl.com/PAN/",
        "desc": "Apply for PAN card via UTIITSL.",
        "keywords": ["uti pan", "utiitsl pan", "new pan"]
      },
      {
        "name": "PAN Correction - UTIITSL",
        "url": "https://www.pan.utiitsl.com/PAN/",
        "desc": "Correct PAN details through UTIITSL.",
        "keywords": ["uti correction", "pan correction uti"]
      }
    ]
  },
  "Parivahan Services": {
    "_icon": "🚗",
    "_color": "#f97316",
    "Driving Licence": [
      {
        "name": "Apply Learner Licence",
        "url": "https://sarathi.parivahan.gov.in/",
        "desc": "Apply for learner licence online.",
        "keywords": ["learner licence", "ll apply", "sarathi"]
      },
      {
        "name": "Apply Driving Licence",
        "url": "https://sarathi.parivahan.gov.in/",
        "desc": "Apply for permanent driving licence.",
        "keywords": ["driving licence", "dl apply", "permanent licence"]
      }
    ],
    "Vehicle": [
      {
        "name": "Vehicle RC Services",
        "url": "https://vahan.parivahan.gov.in/",
        "desc": "RC renewal and vehicle services.",
        "keywords": ["rc renewal", "vehicle rc", "vahan"]
      },
      {
        "name": "Pay e-Challan",
        "url": "https://echallan.parivahan.gov.in/",
        "desc": "Pay pending traffic challan online.",
        "keywords": ["echallan", "traffic fine", "challan pay"]
      }
    ]
  },
  "Health & Digital": {
    "_icon": "🏥",
    "_color": "#db2777",
    "Health": [
      {
        "name": "Ayushman Bharat Eligibility",
        "url": "https://beneficiary.nha.gov.in/",
        "desc": "Check PMJAY eligibility and card status.",
        "keywords": ["pmjay", "ayushman", "health card", "eligibility"]
      },
      {
        "name": "Find PMJAY Hospital",
        "url": "https://hospitals.pmjay.gov.in/",
        "desc": "Find nearby empanelled PMJAY hospitals.",
        "keywords": ["pmjay hospital", "ayushman hospital"]
      }
    ],
    "Digital": [
      {
        "name": "DigiLocker",
        "url": "https://digilocker.gov.in/",
        "desc": "Store and access digital government documents.",
        "keywords": ["digilocker", "digital documents", "document locker"]
      },
      {
        "name": "UMANG",
        "url": "https://web.umang.gov.in/",
        "desc": "Access multiple government services through UMANG.",
        "keywords": ["umang", "government app", "multi service"]
      }
    ]
  }
};
