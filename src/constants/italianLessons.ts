export interface ItalianVocabItem {
  id: string;
  italian: string;
  phonetic: string;
  english: string;
  exampleItalian: string;
  exampleEnglish: string;
}

export interface ItalianLessonUnit {
  id: number;
  title: string;
  theme: string;
  level: 'Beginner' | 'Intermediate' | 'Warehouse Practical';
  vocabulary: ItalianVocabItem[];
  quiz: {
    question: string;
    italianPrompt?: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export const ITALIAN_LESSONS: ItalianLessonUnit[] = [
  {
    id: 1,
    title: 'Warehouse Essentials 1',
    theme: 'Floor & Equipment',
    level: 'Warehouse Practical',
    vocabulary: [
      {
        id: 'w1_1',
        italian: 'Il bancale',
        phonetic: 'eel ban-KAH-leh',
        english: 'The pallet',
        exampleItalian: 'Questo bancale è pieno.',
        exampleEnglish: 'This pallet is full.'
      },
      {
        id: 'w1_2',
        italian: 'Lo scaffale',
        phonetic: 'loh skaf-FAH-leh',
        english: 'The shelf / racking',
        exampleItalian: 'La scatola è sullo scaffale.',
        exampleEnglish: 'The box is on the shelf.'
      },
      {
        id: 'w1_3',
        italian: 'La scatola',
        phonetic: 'lah SKAH-toh-lah',
        english: 'The box / case',
        exampleItalian: 'Prendi tre scatole.',
        exampleEnglish: 'Pick three boxes.'
      },
      {
        id: 'w1_4',
        italian: 'Il muletto',
        phonetic: 'eel moo-LET-toh',
        english: 'The forklift',
        exampleItalian: 'Attento al muletto!',
        exampleEnglish: 'Watch out for the forklift!'
      },
      {
        id: 'w1_5',
        italian: 'Il corridoio',
        phonetic: 'eel kor-ree-DOY-oh',
        english: 'The aisle',
        exampleItalian: 'Vai nel corridoio quattro.',
        exampleEnglish: 'Go to aisle four.'
      }
    ],
    quiz: [
      {
        question: 'What is the Italian word for "The pallet"?',
        options: ['Lo scaffale', 'Il bancale', 'Il corridoio', 'Il muletto'],
        correctIndex: 1,
        explanation: '"Il bancale" means the pallet.'
      },
      {
        question: 'Translate: "Prendi tre scatole."',
        options: ['Pick three boxes.', 'Go to aisle three.', 'Wait three minutes.', 'Lift three pallets.'],
        correctIndex: 0,
        explanation: '"Prendi tre scatole" translates to "Pick three boxes".'
      },
      {
        question: 'What does "Attento al muletto!" mean?',
        options: ['Clean the floor!', 'Watch out for the forklift!', 'Take a break!', 'Scan the item!'],
        correctIndex: 1,
        explanation: '"Il muletto" is the forklift, and "Attento" means watch out/careful.'
      }
    ]
  },
  {
    id: 2,
    title: 'Picking Actions & Pace',
    theme: 'Actions & Speed',
    level: 'Warehouse Practical',
    vocabulary: [
      {
        id: 'w2_1',
        italian: 'Veloce',
        phonetic: 'veh-LOH-cheh',
        english: 'Fast / Quick',
        exampleItalian: 'Dobbiamo essere veloci oggi.',
        exampleEnglish: 'We have to be fast today.'
      },
      {
        id: 'w2_2',
        italian: 'Prendere',
        phonetic: 'PREN-deh-reh',
        english: 'To take / To pick',
        exampleItalian: 'Devo prendere questo collo.',
        exampleEnglish: 'I need to pick this item.'
      },
      {
        id: 'w2_3',
        italian: 'Spostare',
        phonetic: 'spoh-STAH-reh',
        english: 'To move / shift',
        exampleItalian: 'Sposta il carrello.',
        exampleEnglish: 'Move the trolley.'
      },
      {
        id: 'w2_4',
        italian: 'Finito',
        phonetic: 'fee-NEE-toh',
        english: 'Finished / Done',
        exampleItalian: 'L\'ordine è finito.',
        exampleEnglish: 'The order is finished.'
      },
      {
        id: 'w2_5',
        italian: 'La pausa',
        phonetic: 'lah POW-zah',
        english: 'The break',
        exampleItalian: 'È ora della pausa.',
        exampleEnglish: 'It is time for the break.'
      }
    ],
    quiz: [
      {
        question: 'What is the opposite of "Lento" (slow)?',
        options: ['Prendere', 'Veloce', 'La pausa', 'Finito'],
        correctIndex: 1,
        explanation: '"Veloce" means fast or quick.'
      },
      {
        question: 'What does "L\'ordine è finito" mean?',
        options: ['The order is missing', 'The order is finished', 'The order is heavy', 'Cancel the order'],
        correctIndex: 1,
        explanation: '"Finito" means finished or completed.'
      },
      {
        question: 'How do you say "It is time for the break"?',
        options: ['È ora della pausa', 'Prendi il bancale', 'Sposta la scatola', 'Vai veloce'],
        correctIndex: 0,
        explanation: '"La pausa" means the break.'
      }
    ]
  },
  {
    id: 3,
    title: 'Directions & Numbers',
    theme: 'Navigation & Counts',
    level: 'Beginner',
    vocabulary: [
      {
        id: 'w3_1',
        italian: 'Destra',
        phonetic: 'DEH-strah',
        english: 'Right',
        exampleItalian: 'Gira a destra.',
        exampleEnglish: 'Turn right.'
      },
      {
        id: 'w3_2',
        italian: 'Sinistra',
        phonetic: 'see-NEE-strah',
        english: 'Left',
        exampleItalian: 'La porta è a sinistra.',
        exampleEnglish: 'The door is on the left.'
      },
      {
        id: 'w3_3',
        italian: 'Sopra e Sotto',
        phonetic: 'SOH-prah eh SOHT-toh',
        english: 'Above and Below',
        exampleItalian: 'Guarda sopra lo scaffale.',
        exampleEnglish: 'Look above the shelf.'
      },
      {
        id: 'w3_4',
        italian: 'Cento',
        phonetic: 'CHEN-toh',
        english: 'One hundred (100)',
        exampleItalian: 'Cento colli all\'ora.',
        exampleEnglish: 'One hundred items per hour.'
      },
      {
        id: 'w3_5',
        italian: 'Subito',
        phonetic: 'SOO-bee-toh',
        english: 'Right away / Immediately',
        exampleItalian: 'Arrivo subito.',
        exampleEnglish: 'I am coming right away.'
      }
    ],
    quiz: [
      {
        question: 'Translate: "Gira a destra."',
        options: ['Go straight ahead.', 'Turn right.', 'Turn left.', 'Look below.'],
        correctIndex: 1,
        explanation: '"Destra" means right.'
      },
      {
        question: 'What does "Sinistra" mean?',
        options: ['Left', 'Right', 'Behind', 'Inside'],
        correctIndex: 0,
        explanation: '"Sinistra" means left.'
      },
      {
        question: 'What is the Italian word for "Immediately / Right away"?',
        options: ['Sopra', 'Finito', 'Subito', 'Cento'],
        correctIndex: 2,
        explanation: '"Subito" translates to right away or immediately.'
      }
    ]
  },
  {
    id: 4,
    title: 'Everyday Greetings & Co-workers',
    theme: 'Daily Conversational Italian',
    level: 'Beginner',
    vocabulary: [
      {
        id: 'w4_1',
        italian: 'Buongiorno',
        phonetic: 'bwon-JOHR-noh',
        english: 'Good morning / Good day',
        exampleItalian: 'Buongiorno a tutti!',
        exampleEnglish: 'Good morning everyone!'
      },
      {
        id: 'w4_2',
        italian: 'Come va?',
        phonetic: 'KOH-meh vah',
        english: 'How is it going?',
        exampleItalian: 'Ciao Daniel, come va?',
        exampleEnglish: 'Hi Daniel, how is it going?'
      },
      {
        id: 'w4_3',
        italian: 'Tutto bene',
        phonetic: 'TOOT-toh BEH-neh',
        english: 'All good / Everything is fine',
        exampleItalian: 'Sì, tutto bene grazie.',
        exampleEnglish: 'Yes, all good thank you.'
      },
      {
        id: 'w4_4',
        italian: 'A più tardi',
        phonetic: 'ah pyoo TAR-dee',
        english: 'See you later',
        exampleItalian: 'Ci vediamo a più tardi.',
        exampleEnglish: 'See you later.'
      },
      {
        id: 'w4_5',
        italian: 'Buon lavoro',
        phonetic: 'bwon lah-VOH-roh',
        english: 'Have a good shift / work',
        exampleItalian: 'Grazie, buon lavoro anche a te!',
        exampleEnglish: 'Thanks, have a good shift too!'
      }
    ],
    quiz: [
      {
        question: 'How do you wish a colleague a good shift at work in Italian?',
        options: ['Buona notte', 'Buon lavoro', 'Subito', 'A sinistra'],
        correctIndex: 1,
        explanation: '"Buon lavoro" is the standard Italian wish for a good working day.'
      },
      {
        question: 'What is the best reply to "Come va?"',
        options: ['Il bancale', 'Tutto bene, grazie', 'Lo scaffale', 'Sopra'],
        correctIndex: 1,
        explanation: '"Tutto bene, grazie" means all good / everything is fine, thank you.'
      },
      {
        question: 'Translate: "A più tardi"',
        options: ['Good morning', 'See you later', 'Hurry up', 'Excuse me'],
        correctIndex: 1,
        explanation: '"A più tardi" means see you later.'
      }
    ]
  }
];

/**
 * Headset Work Words to ignore in speech recognition
 */
export const WORK_HEADSET_IGNORE_LIST = [
  '1 ready',
  '2 ready',
  '3 ready',
  '4 ready',
  '5 ready',
  'ready',
  'say again',
  'repeat',
  'check',
  'check digit',
  'correction',
  'item',
  'location',
  'quantity',
  'confirm',
  'done',
  'next',
  'aisle',
  'bay',
  'slot'
];

export function isWorkHeadsetPhrase(text: string): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase().trim();
  return WORK_HEADSET_IGNORE_LIST.some(phrase => normalized.includes(phrase));
}
