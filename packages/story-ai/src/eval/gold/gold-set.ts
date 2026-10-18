/**
 * Gold set: safe passages with answer keys, two per tier of `packages/levels`, plus copies with keys
 * planted wrong so verifier agreement can be measured.
 *
 * DRAFTED by an AI assistant for BB-21. Every case starts with `reviewedBy: null` and does not count
 * in any metric or gate until a person checks it and fills `reviewedBy` and `reviewedAt`.
 * See README.md in this folder. Characters are invented. No learner wrote or appears in any passage.
 * Test data, never import from app code or seeds. A test checks that `src/index.ts` and `apps/*` do not.
 */
import { draftedSafe, inferential, literal, vocabulary } from './build';
import { parseCases, withWrongKeys, type GoldCase } from './schema';

const t1a = draftedSafe('gold-t1-a', {
  title: 'The black cat',
  level: 5,
  text: 'Tala has a cat. The cat is black. It naps in the sun.',
  questions: [
    literal('What does Tala have?', ['A dog', 'A cat', 'A bird', 'A fish'], 1, 'Tala has a cat.'),
    literal('What color is the cat?', ['White', 'Orange', 'Black', 'Gray'], 2, 'The cat is black.'),
    literal(
      'Where does the cat nap?',
      ['In the sun', 'In a box', 'In the rain', 'On a bed'],
      0,
      'It naps in the sun.',
    ),
    vocabulary(
      'naps',
      'What does "naps" mean?',
      ['Runs fast', 'Eats food', 'Jumps high', 'Sleeps a little'],
      3,
      'It naps in the sun.',
    ),
    inferential(
      'How does the cat most likely feel in the sun?',
      ['Wet', 'Warm', 'Cold', 'Scared'],
      1,
      'It naps in the sun.',
    ),
  ],
});

const t1b = draftedSafe('gold-t1-b', {
  title: 'Red boots',
  level: 9,
  text: 'Rain falls. Jun gets his red boots. He jumps in a big puddle.',
  questions: [
    literal('What falls?', ['Snow', 'Leaves', 'Sand', 'Rain'], 3, 'Rain falls.'),
    literal(
      'What does Jun get?',
      ['His red boots', 'His blue hat', 'His bag', 'His book'],
      0,
      'Jun gets his red boots.',
    ),
    literal(
      'Where does Jun jump?',
      ['On the bed', 'Over a rock', 'In a big puddle', 'In the sea'],
      2,
      'He jumps in a big puddle.',
    ),
    vocabulary(
      'puddle',
      'What is a puddle?',
      ['A kind of shoe', 'A small pool of water', 'A tall tree', 'A loud sound'],
      1,
      'He jumps in a big puddle.',
    ),
    inferential(
      'Why does Jun get his boots?',
      ['To go to bed', 'To clean the roof', 'To play ball inside', 'To keep his feet dry'],
      3,
      'Jun gets his red boots.',
    ),
  ],
});

const t2a = draftedSafe('gold-t2-a', {
  title: 'The green shoot',
  level: 15,
  text: 'Lola plants seeds in a pot. She waters them every day. After one week, a small green shoot comes up. Lola is happy. She puts the pot by the window so the plant can get more sun.',
  questions: [
    literal(
      'Where does Lola plant the seeds?',
      ['In the yard', 'In a pot', 'In a box', 'In a cup'],
      1,
      'Lola plants seeds in a pot.',
    ),
    literal(
      'How often does she water them?',
      ['Once a week', 'Never', 'Every day', 'Only when it rains'],
      2,
      'She waters them every day.',
    ),
    vocabulary(
      'shoot',
      'In the story, what is a shoot?',
      ['A new part of a plant', 'A loud noise', 'A kind of ball', 'A pot of water'],
      0,
      'After one week, a small green shoot comes up.',
    ),
    literal(
      'Why does Lola put the pot by the window?',
      [
        'So the cat cannot reach it',
        'So she can see the street',
        'So the rain can fall on it',
        'So the plant can get more sun',
      ],
      3,
      'She puts the pot by the window so the plant can get more sun.',
    ),
    inferential(
      'What can you tell about Lola?',
      [
        'She forgets her plant',
        'She takes good care of her plant',
        'She does not like plants',
        'She wants to sell the pot',
      ],
      1,
      'She waters them every day.',
    ),
  ],
});

const t2b = draftedSafe('gold-t2-b', {
  title: 'The lost pencil',
  level: 24,
  text: 'Paolo could not find his yellow pencil. He looked in his bag and under his desk. His classmate Ana smiled and pointed to his ear. Paolo touched his ear. The pencil was there. Everyone laughed, and Paolo laughed too.',
  questions: [
    literal(
      'What color was the pencil?',
      ['Red', 'Blue', 'Yellow', 'Green'],
      2,
      'Paolo could not find his yellow pencil.',
    ),
    literal(
      'Where did Paolo look?',
      ['On the floor', 'In the garden', 'In his shoe', 'In his bag and under his desk'],
      3,
      'He looked in his bag and under his desk.',
    ),
    inferential(
      'Where was the pencil the whole time?',
      ['Under the desk', 'Behind his ear', 'In his bag', 'On the board'],
      1,
      'Paolo touched his ear.',
    ),
    vocabulary(
      'classmate',
      'What is a classmate?',
      ['A person in the same class', 'A teacher', 'A kind of desk', 'A school bus'],
      0,
      'His classmate Ana smiled and pointed to his ear.',
    ),
    inferential(
      'Why did everyone laugh?',
      [
        'Paolo fell off his chair',
        'The bell rang early',
        'The pencil was on his ear all along',
        'Ana told a joke about a cat',
      ],
      2,
      'Everyone laughed, and Paolo laughed too.',
    ),
  ],
});

const t3a = draftedSafe('gold-t3-a', {
  title: 'Saturday at sea',
  level: 40,
  text: "Every Saturday, Miguel goes fishing with his uncle. They leave the shore before the sun comes up. The sea is calm and quiet in the early morning. His uncle shows him how to tie the net so the fish cannot escape. By noon, the boat is full of silver fish. They sell some at the market and bring the rest home. Miguel's mother cooks them with rice and vegetables for dinner.",
  questions: [
    literal(
      'When does Miguel go fishing?',
      ['Every night', 'Every Saturday', 'Only in the rain', 'Once a year'],
      1,
      'Every Saturday, Miguel goes fishing with his uncle.',
    ),
    literal(
      'How is the sea in the early morning?',
      ['Rough and loud', 'Cold and icy', 'Calm and quiet', 'Dark and stormy'],
      2,
      'The sea is calm and quiet in the early morning.',
    ),
    vocabulary(
      'escape',
      'What does "escape" mean in the story?',
      ['Swim deeper', 'Grow bigger', 'Change color', 'Get away'],
      3,
      'His uncle shows him how to tie the net so the fish cannot escape.',
    ),
    literal(
      'What do they do with some of the fish?',
      ['Sell them at the market', 'Throw them back', 'Give them to the cat', 'Keep them in a tank'],
      0,
      'They sell some at the market and bring the rest home.',
    ),
    inferential(
      'What is Miguel learning from his uncle?',
      ['How to cook rice', 'How to build a boat', 'How to catch fish', 'How to sell vegetables'],
      2,
      'His uncle shows him how to tie the net so the fish cannot escape.',
    ),
  ],
});

const t3b = draftedSafe('gold-t3-b', {
  title: 'When the lights went out',
  level: 50,
  text: "One evening, the lights in Rina's house went out. The fan stopped, and the room became hot and dark. Rina felt a little afraid. Her grandmother lit a candle and placed it on a plate in the middle of the table. Then she told stories about the town when she was a girl, before there was any electricity. Rina listened closely. When the lights came back on, she almost wished they had stayed off a little longer.",
  questions: [
    literal(
      'What stopped when the lights went out?',
      ['The radio', 'The fan', 'The car', 'The clock'],
      1,
      'The fan stopped, and the room became hot and dark.',
    ),
    literal(
      'What did Grandmother light?',
      ['A lamp', 'A fire', 'A torch', 'A candle'],
      3,
      'Her grandmother lit a candle and placed it on a plate in the middle of the table.',
    ),
    vocabulary(
      'electricity',
      'What is electricity?',
      [
        'A kind of candle',
        'A story about a town',
        'Power that makes lights and fans work',
        'A type of plate',
      ],
      2,
      'Then she told stories about the town when she was a girl, before there was any electricity.',
    ),
    inferential(
      "How did Rina's feelings change during the night?",
      [
        'She went from afraid to enjoying the night',
        'She went from happy to angry',
        'She was bored the whole time',
        'She was afraid the whole time',
      ],
      0,
      'When the lights came back on, she almost wished they had stayed off a little longer.',
    ),
    literal(
      'What did Grandmother tell stories about?',
      ['A dragon in the sea', 'Her trip to the moon', 'A famous singer', 'The town long ago'],
      3,
      'Then she told stories about the town when she was a girl, before there was any electricity.',
    ),
  ],
});

const t4a = draftedSafe('gold-t4-a', {
  title: 'The boat that tipped',
  level: 60,
  text: "Our science teacher, Ma'am Lim, announced a contest. Each group had to build a boat from recycled materials that could carry ten coins across the school pond. My group collected plastic bottles, bottle caps and an old lunch box. At first, our boat tipped over as soon as we added the coins. We were disappointed, but Ma'am Lim reminded us that mistakes help us learn. We noticed that all the weight was on one side, so we spread the coins evenly and tied two bottles to the sides for balance. On the day of the race, our boat floated slowly but steadily to the other side. We did not win first place, but we finished, and every coin stayed dry.",
  questions: [
    literal(
      'What did each group have to build?',
      ['A kite', 'A boat from recycled materials', 'A bridge from sticks', 'A bird house'],
      1,
      'Each group had to build a boat from recycled materials that could carry ten coins across the school pond.',
    ),
    literal(
      'What happened when they first added the coins?',
      [
        'The boat sank slowly',
        'The coins fell in the grass',
        'The boat tipped over',
        'The boat floated away',
      ],
      2,
      'At first, our boat tipped over as soon as we added the coins.',
    ),
    vocabulary(
      'evenly',
      'What does "evenly" mean in the story?',
      ['Very quickly', 'All in one place', 'In the same amount on every side', 'Very loudly'],
      2,
      'We noticed that all the weight was on one side, so we spread the coins evenly and tied two bottles to the sides for balance.',
    ),
    inferential(
      'Why did the boat tip over at first?',
      [
        'The pond was too deep',
        'The bottles had holes',
        'The wind was too strong',
        'The weight was all on one side',
      ],
      3,
      'We noticed that all the weight was on one side, so we spread the coins evenly and tied two bottles to the sides for balance.',
    ),
    inferential(
      'What lesson does the group learn?',
      [
        'Mistakes can help you improve',
        'Winning is all that matters',
        'Boats should be made of wood',
        'Coins are too heavy to carry',
      ],
      0,
      "We were disappointed, but Ma'am Lim reminded us that mistakes help us learn.",
    ),
  ],
});

const t4b = draftedSafe('gold-t4-b', {
  title: 'A seat on the jeepney',
  level: 70,
  text: "Every morning, Carlo rides a jeepney to school with his older sister, Bea. The jeepney is painted with bright colors and has a silver horse on the hood. Passengers sit facing each other on two long benches. When someone wants to get off, they knock on the roof to tell the driver. Carlo likes to pass coins from other passengers forward to the driver. It makes him feel helpful. One rainy morning, the jeepney was so crowded that Carlo had to sit on Bea's lap. A kind woman moved closer to the window so that he could have his own seat. Carlo thanked her and decided that he would do the same for someone else one day.",
  questions: [
    literal(
      'Who rides with Carlo?',
      ['His father', 'His older sister', 'His teacher', 'His best friend'],
      1,
      'Every morning, Carlo rides a jeepney to school with his older sister, Bea.',
    ),
    literal(
      'How do passengers sit?',
      [
        'In rows facing the front',
        'On the roof',
        'Standing up the whole time',
        'Facing each other on two long benches',
      ],
      3,
      'Passengers sit facing each other on two long benches.',
    ),
    vocabulary(
      'passengers',
      'Who are passengers?',
      [
        'People who ride in a vehicle',
        'People who drive buses',
        'People who paint jeepneys',
        'People who sell coins',
      ],
      0,
      'Passengers sit facing each other on two long benches.',
    ),
    literal(
      'Why did the woman move closer to the window?',
      [
        'She wanted to see the rain',
        'The driver told her to',
        'So Carlo could have his own seat',
        'She was getting off soon',
      ],
      2,
      'A kind woman moved closer to the window so that he could have his own seat.',
    ),
    inferential(
      'What will Carlo probably do in the future?',
      [
        'Stop riding the jeepney',
        'Give his seat to someone who needs it',
        'Sit on the roof',
        'Ask the woman for money',
      ],
      1,
      'Carlo thanked her and decided that he would do the same for someone else one day.',
    ),
  ],
});

const t5a = draftedSafe('gold-t5-a', {
  title: 'Gardens under the sea',
  level: 80,
  text: 'Coral reefs look like colorful gardens under the sea, but corals are actually animals. Each coral is made of many tiny creatures that build hard shells out of minerals in seawater. Over hundreds of years, these shells pile up and form the large structures we call reefs. The seas around the Philippines have more kinds of coral than almost anywhere else on Earth. Reefs give food and shelter to thousands of kinds of fish, crabs and sea turtles. They also protect towns on the coast by slowing down large waves during storms. However, reefs are in danger. When ocean water becomes too warm, corals lose the tiny plants that live inside them and give them their color. This is called bleaching, and it can cause corals to die if the water does not cool down. Trash and fishing with explosives also harm reefs. Many towns now protect parts of the sea where fishing is not allowed, so that the reef has time to heal.',
  questions: [
    literal(
      'What are corals?',
      ['Plants', 'Rocks', 'Animals', 'Fish'],
      2,
      'Coral reefs look like colorful gardens under the sea, but corals are actually animals.',
    ),
    literal(
      'How do reefs protect towns on the coast?',
      [
        'By cleaning the water',
        'By slowing down large waves',
        'By feeding the people',
        'By blocking the wind',
      ],
      1,
      'They also protect towns on the coast by slowing down large waves during storms.',
    ),
    vocabulary(
      'bleaching',
      'What is bleaching?',
      [
        'When fish leave the reef',
        'When reefs grow very fast',
        'When sand covers the coral',
        'When corals lose their color because the water is too warm',
      ],
      3,
      'This is called bleaching, and it can cause corals to die if the water does not cool down.',
    ),
    inferential(
      'Why do towns stop fishing in some parts of the sea?',
      [
        'To give damaged reefs time to recover',
        'To make the water warmer',
        'To bring more boats',
        'To let the fish grow too big',
      ],
      0,
      'Many towns now protect parts of the sea where fishing is not allowed, so that the reef has time to heal.',
    ),
    inferential(
      'What would most likely happen if warm water around a reef never cooled?',
      [
        'The reef would grow faster',
        'More fish would come',
        'The corals could die',
        'The waves would get bigger',
      ],
      2,
      'This is called bleaching, and it can cause corals to die if the water does not cool down.',
    ),
  ],
});

const t5b = draftedSafe('gold-t5-b', {
  title: 'Ready for the storm',
  level: 88,
  text: "When the radio announced that a strong typhoon would reach their province in two days, Lina's family began to prepare. Her father checked the roof and tied down the loose metal sheets with thick rope. Her mother filled large containers with clean drinking water and packed canned food, a flashlight and extra batteries into a waterproof bag. Lina's job was to gather important papers, such as birth certificates and school records, and seal them in plastic. On the night the typhoon arrived, the wind howled and rain hammered against the windows. The power went out, but the family stayed calm because they had planned for it. They listened to updates on a small radio that ran on batteries. By morning, the storm had passed. Several trees had fallen across the road, and a neighbor's fence had collapsed, but Lina's house was safe. Later that week, her teacher asked the class what they had learned. Lina explained that preparing early made her family feel less frightened, because everyone already knew what to do.",
  questions: [
    literal(
      "What did Lina's father do to prepare?",
      [
        'Bought a new radio',
        'Tied down the loose metal sheets on the roof',
        'Cut down the trees',
        'Painted the windows',
      ],
      1,
      'Her father checked the roof and tied down the loose metal sheets with thick rope.',
    ),
    literal(
      "What was Lina's job?",
      [
        'Filling containers with water',
        'Checking the roof',
        'Cooking dinner',
        'Sealing important papers in plastic',
      ],
      3,
      "Lina's job was to gather important papers, such as birth certificates and school records, and seal them in plastic.",
    ),
    vocabulary(
      'collapsed',
      'What does "collapsed" mean in the story?',
      ['Grew taller', 'Fell down', 'Was painted', 'Was locked'],
      1,
      "Several trees had fallen across the road, and a neighbor's fence had collapsed, but Lina's house was safe.",
    ),
    inferential(
      'Why did the family stay calm when the power went out?',
      [
        'They were asleep',
        'The storm was weak',
        'They had already prepared for it',
        'The neighbors helped them',
      ],
      2,
      'The power went out, but the family stayed calm because they had planned for it.',
    ),
    inferential(
      'What is the main lesson of the story?',
      [
        'Preparing early helps people feel safer in a storm',
        'Typhoons are not dangerous',
        'A radio is the only tool you need',
        'Fences should be made of metal',
      ],
      0,
      'Lina explained that preparing early made her family feel less frightened, because everyone already knew what to do.',
    ),
  ],
});

const t6a = draftedSafe('gold-t6-a', {
  title: 'Stairs to the clouds',
  level: 95,
  text: 'High in the mountains of northern Luzon, the Ifugao people carved rice terraces into steep slopes long ago. Seen from far away, the terraces look like huge green stairs climbing toward the clouds. Building them took great skill. Farmers made walls of stone and mud to hold each level in place. They also designed a system that carries water from the forests at the top of the mountains down through every terrace. The forests act like giant sponges. They soak up rain and release it slowly, so protecting them was necessary for the fields below to survive. For hundreds of years, families passed down not only the land but also the songs, customs and farming methods connected to it. In 1995, the terraces were named a World Heritage Site, which means the world agreed they are worth protecting. Yet the terraces face serious problems today. Many young people have moved to cities to look for different kinds of work, leaving fewer hands to repair the walls and plant the fields. Earthquakes, heavy rains and worms that dig through the soil have also weakened parts of the terraces. In response, local groups have started programs that teach students the old methods. They also encourage visitors to come in ways that support farmers instead of crowding them. The future of the terraces may depend on whether the next generation decides that this old way of life is worth continuing.',
  questions: [
    literal(
      'What do the terraces look like from far away?',
      ['Tall gray towers', 'Wide blue lakes', 'Huge green stairs', 'Small brown huts'],
      2,
      'Seen from far away, the terraces look like huge green stairs climbing toward the clouds.',
    ),
    literal(
      'Where does the water for the terraces come from?',
      [
        'The forests at the top of the mountains',
        'A river in the city',
        'Wells dug by visitors',
        'The sea',
      ],
      0,
      'They also designed a system that carries water from the forests at the top of the mountains down through every terrace.',
    ),
    vocabulary(
      'terraces',
      'What are terraces in this passage?',
      [
        'Stone houses for farmers',
        'Flat steps of land cut into a slope',
        'Songs about the mountains',
        'Large forests at the top of a mountain',
      ],
      1,
      'High in the mountains of northern Luzon, the Ifugao people carved rice terraces into steep slopes long ago.',
    ),
    inferential(
      'Why is it important to protect the forests above the terraces?',
      [
        'They give shade to visitors',
        'They stop earthquakes',
        'They keep worms away',
        'They store rain and send water slowly to the fields',
      ],
      3,
      'They soak up rain and release it slowly, so protecting them was necessary for the fields below to survive.',
    ),
    inferential(
      'According to the author, what does the future of the terraces depend on?',
      [
        'Whether more visitors come',
        'Whether the walls are rebuilt in metal',
        'Whether young people choose to keep the old ways',
        'Whether it rains less',
      ],
      2,
      'The future of the terraces may depend on whether the next generation decides that this old way of life is worth continuing.',
    ),
  ],
});

const t6b = draftedSafe('gold-t6-b', {
  title: 'Both sides of the debate',
  level: 99,
  text: "When their teacher announced that the class would debate whether students should be allowed to use phones during lunch, Andrea volunteered to argue against the idea. She was confident at first, since she had noticed that her friends barely spoke to one another while watching videos. However, as she began her research, she discovered that the issue was more complicated than she had thought. Some students needed their phones to contact parents who worked far away. Others used translation apps to talk with classmates who spoke a different language at home. Andrea realized that a total ban might solve one problem while creating several others. Rather than giving up her position, she improved it. During the debate, she proposed a compromise: phones could be used during the first half of lunch, but the second half would be kept for conversation and games without screens. Her opponent, Marco, argued that students should learn to manage their own time without strict rules. The audience listened carefully as both speakers answered each other's points with facts and examples. In the end, the judges declared the debate a tie and praised both speakers for their careful thinking. Afterward, Andrea admitted to Marco that preparing for the debate had changed her mind about several things. She had learned that listening to the other side does not mean losing an argument. Sometimes it leads to a better answer than either side began with.",
  questions: [
    literal(
      'What side did Andrea argue at the start?',
      [
        'For allowing phones all day',
        'Against allowing phones during lunch',
        'For a longer lunch break',
        'Against having debates',
      ],
      1,
      'When their teacher announced that the class would debate whether students should be allowed to use phones during lunch, Andrea volunteered to argue against the idea.',
    ),
    literal(
      'Why did some students need their phones?',
      [
        'To play games in class',
        'To take tests',
        'To call the judges',
        'To contact parents who worked far away',
      ],
      3,
      'Some students needed their phones to contact parents who worked far away.',
    ),
    vocabulary(
      'compromise',
      'What is a compromise?',
      [
        'A plan where each side gives up something',
        'A complete ban',
        'A kind of phone app',
        'A prize for the winner',
      ],
      0,
      'During the debate, she proposed a compromise: phones could be used during the first half of lunch, but the second half would be kept for conversation and games without screens.',
    ),
    inferential(
      'Why did Andrea change her position instead of keeping it the same?',
      [
        'Her teacher told her she was wrong',
        'Marco asked her to change it',
        'Her research showed a total ban could cause new problems',
        'She wanted the judges to like her',
      ],
      2,
      'Andrea realized that a total ban might solve one problem while creating several others.',
    ),
    inferential(
      'Which statement best describes the lesson of the story?',
      [
        'Phones should always be banned',
        'Listening to other views can lead to better solutions',
        'Debates must always have a winner',
        'It is best never to change your mind',
      ],
      1,
      'She had learned that listening to the other side does not mean losing an argument.',
    ),
  ],
});

const SAFE_CASES = [t1a, t1b, t2a, t2b, t3a, t3b, t4a, t4b, t5a, t5b, t6a, t6b];

/** Copies with planted wrong keys. The verifier should disagree with exactly those questions. */
const WRONG_KEY_CASES = [
  withWrongKeys(t2b, [3]),
  withWrongKeys(t4a, [1, 4]),
  withWrongKeys(t6a, [5]),
];

export const GOLD_SET: GoldCase[] = parseCases([...SAFE_CASES, ...WRONG_KEY_CASES]);
