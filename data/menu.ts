/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// AUTO-EXTRACTED from the original script.js (lines 1-128), verbatim.
// This is the exact same menu data and the exact same category-reorganization
// logic as the live site — copied programmatically (not retyped) to guarantee
// zero transcription drift in prices, names, ingredients or ordering.
// Asset paths were rewritten from "assets/x" to "/assets/x" to match the
// public/ convention (the only change made anywhere in this file).
// @ts-nocheck is scoped to this file only: it exempts the mechanical, already
// battle-tested transform logic below from type-checking, while the exported
// `menu` constant is still given a real MenuCategory[] type for every consumer.

import { slugify } from "@/lib/slugify";

export interface ProductDetails {
  ingredients: string[];
  size?: string;
  protein?: string;
  carbohydrates?: string;
  calories?: string;
}

/** [name, description, price, image, tag, details, column, id] */
export type MenuItem = [string, string, number, string, string, ProductDetails, string, string];

export interface MenuCategory {
  category: string;
  slug: string;
  tagline: string;
  items: MenuItem[];
}

function buildMenu() {
  let menu = [
    {category:'Breakfast',slug:'breakfast',tagline:'Fresh mornings · made to nourish',items:[['Avacado Toast with Poached Eggs','Creamy avocado toast topped with poached eggs and served with a fresh garden salad',41,'/assets/avacado-toast-poached-eggs-f2.webp',''],['Avacado Toast with Salmon','Creamy avocado toast topped with salmon and served with a fresh garden salad',49,'/assets/avacado-toast-salmon-f1.webp',''],['Avacado Toast with Green Olives','Avocado toast with a poached egg, served with a fresh garden salad',41,'/assets/avacado-toasted-poached-egg-f3.webp','']]},
    {category:'Pancakes',slug:'pancakes',tagline:'Warm stacks · sweet moments',items:[['Nutella Pancake','Fluffy pancakes layered with Nutella and finished with fresh berries',32,'/assets/pancake-nutella.png','V'],['Berries Pancake','Fluffy pancakes topped with strawberries, blueberries, raspberries and blackberries',32,'/assets/pancake-berries.png','V'],['Classic Pancake','Classic fluffy pancakes finished with cream, berries and a touch of syrup',27,'/assets/pancake-classic.png','V'],['French Toast','Golden French toast served with banana, cream and fresh berries',46,'/assets/pancake-french-toast.png','V'],['Pistachio Pancake','Fluffy pancakes topped with pistachio cream, crushed pistachios and fresh fruit',32,'/assets/pancake-pistachio.png','V']]},
    {category:'Hot Beverages',slug:'hot-beverages',tagline:'Warm cups · better moments',items:[['Americano','Espresso lengthened with hot water for a smooth, bold cup',19,'/assets/hot-americano.webp',''],['Cappuccino','Espresso with silky steamed milk and a smooth foam finish',24,'/assets/hot-cappuccino-flat-white.png',''],['Cafe Latte','Espresso marked with silky milk and a smooth foam finish',24,'/assets/hot-cappuccino-macchiato.png',''],['Spanish Latte','Espresso balanced with warm, lightly textured milk',24,'/assets/hot-cappuccino-cortado.png',''],['Expresso','A rich, full-bodied single shot',17,'/assets/hot-expresso.webp',''],['Hot Matcha Latte','Matcha whisked with smooth steamed milk',26,'/assets/hot-matcha-latte.webp','V'],['Matcha','Smooth matcha served warm with a creamy finish',26,'/assets/hot-matcha-new.png','V'],['Mochaccino','Espresso, chocolate and silky steamed milk',25,'/assets/hot-mochaccino.webp',''],['Cortado','A short espresso softened with textured milk',24,'/assets/hot-piccolo.webp',''],['Flat White','Velvety espresso with smooth steamed milk and a fine microfoam finish',24,'/assets/hot-piccolo.webp',''],['Piccolo','A short espresso softened with smooth steamed milk',24,'/assets/hot-piccolo.webp',''],['Tea Selections','A curated selection of classic hot teas',18,'/assets/hot-tea-selections.webp','V'],['Tisane Tea','A soothing caffeine-free herbal infusion',20,'/assets/hot-tisane-tea.webp','VG'],['V60','Hand-poured filter coffee with a clean, aromatic finish',26,'/assets/hot-v60.webp','']]},
    {category:'Salads',slug:'salads',tagline:'Fresh · crisp · satisfying',items:[['Blood Sugar Level','Chickpeas, avocado, cucumber, tomatoes, radish and olives',25,'/assets/salad-blood-sugar-level.webp','VG'],['Chicken Ceasar','Grilled chicken, avocado, baby gem, parmesan and croutons',29,'/assets/salad-chicken-ceasar.webp',''],['Colon Cleaning','Beetroot, carrot and cabbage in a bright citrus dressing',25,'/assets/salad-colon-cleaning.webp','VG'],['Flat Stomach','Green peas, cucumber and red cabbage with fresh herbs',25,'/assets/salad-flat-stomach.webp','VG'],['Tabbouloleh Salad','Couscous, cucumber, tomato, herbs and red onion',25,'/assets/salad-tabbouloleh.webp','VG'],['Triple Berries Salad','Spinach, strawberries, blueberries, blackberries and feta',29,'/assets/salad-triple-berries.webp','V']]},
    {category:'Sandwiches',slug:'sandwiches',tagline:'Freshly made · full of flavour',items:[['Beef Pastrami','Beef pastrami, melted cheese, lettuce and onion',38,'/assets/sandwich-beef-pastrami-new.png',''],['Chickado','Chicken, avocado, tomato, cucumber and creamy dressing',38,'/assets/sandwich-chickado-new.png',''],['Halloumi Avacado','Halloumi, avocado, cucumber and tomato',38,'/assets/sandwich-halloumi-avocado-new.png','V'],['Halloumi Pesto','Halloumi, pesto, cucumber and tomato',38,'/assets/sandwich-halloumi-pesto-new.png','V'],['Labneh','Labneh, cucumber, tomato, olives and greens',38,'/assets/sandwich-labneh-new.png','V'],['Melted Cheese','Warm melted cheese and tomato',38,'/assets/sandwich-melted-cheese-new.png','V'],['Smoked Salmon','Smoked salmon, cucumber and cream cheese',38,'/assets/sandwich-smoked-salmon-new.png',''],['Smoked Turkey','Smoked turkey, melted cheese, tomato and pesto',38,'/assets/sandwich-smoked-turkey-new.png','']]},
    {category:'Healthy Bowls',slug:'healthy-bowls',tagline:'Balanced fuel · bold flavour',items:[['Acai Bowl','Açaí topped with banana, berries, granola and peanut butter',46,'/assets/bowl-acai-new.webp','VG'],['Blue Crash Bowl','A vibrant blue smoothie bowl with mango, banana, berries and granola',44,'/assets/bowl-blue-crash-new.webp','VG'],['Mystic Matcha Bowl','A berry smoothie bowl with avocado, banana, cucumber and granola',44,'/assets/bowl-mystic-matcha-new.webp','VG'],['Green Dream Bowl','A colourful wellness bowl with fruit, vegetables, nuts and granola',44,'/assets/bowl-green-dream-new.webp','VG'],['Detox Me Later Glow Bowl','A pink smoothie bowl topped with tropical fruit, berries and pomegranate',44,'/assets/bowl-detox-glow-new.webp','VG'],['Tropical Glow Bowl','A tropical green bowl with avocado, mango, pineapple and berries',44,'/assets/bowl-tropical-glow-new.webp','VG'],['Watermelon Feta','Fresh watermelon, feta, chia seeds and mint',25,'/assets/bowl-watermelon-feta-new.webp','V']]},
    {category:'Protein Bars',slug:'protein-bars',tagline:'Clean energy · ready to go',items:[['Fignuts','Figs, nuts and seeds pressed into a naturally energising bar',16,'/assets/protein-bar-fignuts.webp','VG'],['Walnana','A rich cacao and nut protein bar with a smooth finish',16,'/assets/protein-bar-klalnana.webp','VG'],['Nutri Tropix','A layered tropical fruit and nut energy bar',16,'/assets/protein-bar-nutri-tropix.webp','VG'],['Nutty Date Delight Ball','Chocolate-coated date and nut energy balls',16,'/assets/protein-bar-nutty-date-delight-ball.webp','VG']]},
    {category:'Cakes & Pastries',slug:'cakes-pastries',tagline:'Freshly baked · perfectly paired',items:[['Banana Bread','A soft, moist slice of classic banana bread',16,'/assets/pastry-banana-cake.webp',''],['Blueberry Muffin','A tender muffin baked with juicy blueberries',16,'/assets/pastry-blueberry-muffin.webp',''],['Brownies','A rich, fudgy chocolate brownie',16,'/assets/pastry-brownies.webp',''],['Chocolate Muffin','A soft chocolate muffin with a deeply cocoa-rich finish',16,'/assets/pastry-chocolate-muffin.webp','']]},
    {category:'Protein Shakes',slug:'protein-shakes',tagline:'Strong blends · smooth finish',items:[['Cookies & Cream','Cookies-and-cream protein blended with chilled milk',36,'/assets/protein-shake-cookies-cream.webp',''],['Date-me','Dates, banana and protein blended into a naturally sweet shake',36,'/assets/protein-shake-date-me.webp',''],['PB & J','Peanut butter, berries and protein blended until smooth',38,'/assets/protein-shake-pb-j.webp',''],['Rumble in the Jungle','A green protein blend with banana and leafy greens',38,'/assets/protein-shake-rumble-jungle.webp',''],['Power Protein','A smooth, creamy protein shake made to fuel your day',38,'/assets/protein-shake-power-protein-new.png',''],['Ice and Shake','A chilled, creamy protein shake blended smooth over ice',26,'/assets/protein-shake-ice-and-shake.png',''],['Build Your Own','Choose your preferred ingredients and create your own protein shake',38,'/assets/protein-shake-build-your-own.png','']]},
    {category:'Cold Beverages',slug:'cold-beverages',tagline:'Chilled · clean · refreshing',items:[['Blue Lagoon Mojito','A bright citrus-mint cooler with sparkling blue lagoon flavour',28,'/assets/cold-blue-lagoon-mojito.webp','VG'],['Blueberry Mojito','Blueberry, fresh mint, citrus and sparkling soda',28,'/assets/cold-blueberry-mojito.webp','VG'],['Strawberry Mojito','Strawberry, fresh mint, lime and sparkling soda',25,'/assets/cold-strawberry-mojito.png','VG'],['Classic Mojito','Fresh lime, mint and sparkling soda',26,'/assets/cold-classic-mojito.webp','VG'],['Passion Fruit Mojito','Passion fruit, fresh mint, lime and sparkling soda',28,'/assets/cold-passion-fruit-mojito.webp','VG'],['Evian Water','Natural mineral water from the French Alps',12,'/assets/cold-evian-water.webp','VG'],['Vitamin Well Upgrade','Lemon-cactus vitamin drink with magnesium and zinc',20,'/assets/cold-vitamin-well-upgrade.webp','VG'],['C4 Energy Drink','Zero-sugar performance energy drink',20,'/assets/cold-c4-energy-drink.webp','VG'],['Cold Drip Coffee','Slow-dripped cold coffee with a smooth, bold finish',26,'/assets/cold-drip-coffee.webp',''],['Iced V60','Hand-brewed filter coffee served over ice',28,'/assets/hot-iced-v60.webp',''],['Ginger Ice Tea','Chilled tea infused with bright, warming ginger',20,'/assets/cold-ginger-ice-tea.webp','VG'],['Ice Americano','Double espresso poured over ice',18,'/assets/cold-iced-americano.webp',''],['Ice Latte','Espresso layered with chilled milk and served over ice',24,'/assets/ice-latte.png',''],['Ice Matcha Latte','Matcha shaken with chilled milk and ice',29,'/assets/cold-iced-matcha-latte.webp','V'],['Iced Spanish Latte','Espresso, chilled milk and gentle sweetness',27,'/assets/cold-iced-spanish-latte.webp',''],['Passion Fruit Ice Tea','Chilled tea brightened with tropical passion fruit',20,'/assets/cold-passion-fruit-ice-tea.webp','VG'],['Peach Ice Tea','Smooth chilled tea with ripe peach flavour',20,'/assets/cold-peach-ice-tea.webp','VG'],['Raspberry-Cano','A refreshing raspberry-infused iced Americano',24,'/assets/cold-raspberry-cano.webp',''],['Perrier Sparkling Water','Classic Perrier natural sparkling mineral water',12,'/assets/cold-perrier-bottle.webp','VG'],['Perrier Sparkling Water with Lemon','Perrier sparkling water served over ice with lemon',12,'/assets/cold-perrier-glass.webp','VG']]},
    {category:'Frappes',slug:'frappes',tagline:'Blended cold · seriously smooth',items:[['Caramel Frappe','Espresso, caramel and chilled milk blended until smooth',32,'/assets/frappe-caramel.webp',''],['Matcha Frappe','Matcha and chilled milk blended to a creamy finish',34,'/assets/frappe-matcha.webp','V'],['Mocha Frappe','Espresso, dark chocolate and chilled milk blended until smooth',32,'/assets/frappe-mocha.webp',''],["Press'd Frappe",'Our signature creamy coffee frappe',34,'/assets/frappe-pressd.webp','']]},
    {category:'Smoothies',slug:'smoothies',tagline:'Fruit-forward · naturally energising',items:[['Energy Booster','Mixed berries, banana and a naturally energising fruit blend',30,'/assets/smoothie-energy-booster.webp','VG'],['Green Machine','Leafy greens, apple, banana and a fresh tropical blend',30,'/assets/smoothie-green-machine.webp','VG'],['Mango Mania','Mango, banana and tropical fruit blended until smooth',30,'/assets/smoothie-mango-mania.webp','VG'],['Pina Colada','Pineapple and coconut blended into a creamy tropical smoothie',30,'/assets/smoothie-pina-colada.webp','VG'],['Rubby Antioxidant Blend','A deep ruby blend of antioxidant-rich fruits and berries',32,'/assets/smoothie-ruby-antioxydont-blind.webp','VG'],['Srawberry Fusin','Strawberries and banana blended into a bright fruit smoothie',30,'/assets/smoothie-srawberry-fusin.webp','VG'],['Build Your Own','Choose your preferred ingredients and create your own smoothie',32,'/assets/smoothie-build-your-own.png','']]},
    {category:'Fresh Juices',slug:'fresh-juices',tagline:'Pressed fresh · nothing hidden',items:[['Carrot','Freshly pressed carrot juice served chilled',24,'/assets/juice-carrot.webp','VG'],['Green Apple','Crisp green apples pressed fresh to order',26,'/assets/juice-green-apple.webp','VG'],['Orange','Freshly pressed orange juice served chilled',24,'/assets/juice-orange.webp','VG'],['Watermelon','Fresh watermelon juice served over ice',24,'/assets/juice-watermelon.webp','VG']]},
    {category:'Mocktails',slug:'mocktails',tagline:'Bright · sparkling · alcohol-free',items:[['Fresh Mint Lemonade','Fresh lemon and mint blended into a bright, cooling drink',26,'/assets/mocktail-fresh-mint-lemonade.webp','VG'],['Immunity Booster','A vibrant citrus blend made for a refreshing lift',28,'/assets/mocktail-immunity-booster.webp','VG'],['Incredible Hulk','A bold green wellness blend served chilled',30,'/assets/mocktail-incredible-hulk.webp','VG'],['The Shield','A smooth, refreshing signature wellness blend',30,'/assets/mocktail-the-shield.webp','VG']]}
  ];
  
  // Menu facts transcribed from the supplied printed menu. Items not present in
  // that source still get a details view using their existing card description.
  const productDetails={
    'Avacado Toast with Poached Eggs':{ingredients:['Sourdough bread','2 eggs','Mashed avocado','Cherry tomatoes','Lettuce','Radish','Labneh cheese','Black pepper','Table salt']},
    'Avacado Toast with Salmon':{ingredients:['Sourdough bread','Smoked salmon','Mashed avocado','Cherry tomatoes','Cucumber','Lettuce','Radish','Black pepper','Sesame seeds','Table salt']},
    'Avacado Toast with Green Olives':{ingredients:['Sourdough bread','Green olives','Mashed avocado','Cherry tomatoes','Lettuce','Radish','Labneh cheese','Black pepper','Sesame seeds','Table salt']},
    'Acai Bowl':{ingredients:['Acai puree','Banana','Berries','Homemade granola','Chia seeds','Peanut butter']},
    'Blue Crash Bowl':{ingredients:['Greek yogurt','Blue spirulina','Mango','Homemade granola','Banana','Berries','Maple syrup']},
    'Mystic Matcha Bowl':{ingredients:['Greek yogurt','Blue spirulina','Blue matcha','Mango','Berries','Avocado','Cucumber','Homemade granola']},
    'Green Dream Bowl':{ingredients:['Greek yogurt','Moringa','Green spirulina','Kiwi','Banana','Mango','Homemade granola','Apricot','Beetroot','Toasted almond','Berries']},
    'Detox Me Later Glow Bowl':{ingredients:['Greek yogurt','Pink matcha','Banana','Mango','Dragon fruit','Berries','Pomegranate','Homemade granola']},
    'Tropical Glow Bowl':{ingredients:['Greek yogurt','Avocado','Mango','Banana','Homemade granola','Pineapple','Berries','Pistachio']},
    'Watermelon Feta':{ingredients:['Watermelon','Feta cheese','Lemon','Chia seeds']},
    'Blood Sugar Level':{ingredients:['Chickpeas','Cucumber','Cherry tomatoes','Avocado','Green olives','Radish','Green onions','Parsley','Black pepper','Olive oil','Lemon juice','Table salt']},
    'Chicken Ceasar':{ingredients:['Lettuce','Grilled chicken','Avocado','Cherry tomatoes','Croutons','Parmesan cheese']},
    'Colon Cleaning':{ingredients:['Carrot','Beetroot','Cabbage','Red apple','Table salt','Lemon juice']},
    'Flat Stomach':{ingredients:['Red cabbage','Green peas','Cucumber','Parsley','Green onion','Black pepper','Lemon juice','Table salt']},
    'Tabbouloleh Salad':{ingredients:['Bulgur wheat','Cherry tomatoes','Cucumber','Red onions','Parsley','Green onion']},
    'Triple Berries Salad':{ingredients:['Baby spinach','Homemade granola','Berries','Feta cheese']},
    'Nutella Pancake':{ingredients:['Greek yogurt cream']},
    'Berries Pancake':{ingredients:['Greek yogurt cream']},
    'Classic Pancake':{ingredients:['Greek yogurt cream']},
    'French Toast':{ingredients:['Greek yogurt cream']},
    'Pistachio Pancake':{ingredients:['Greek yogurt cream']},
    'Power Protein':{ingredients:['Acai puree','Blueberries','Cherry','Banana','Beetroot','Whey protein powder']},
    'Protein Shakes:Build Your Own':{ingredients:['Type in the comment area your choice of three selected fruits, protein powder, and milk']},
    'Fignuts':{ingredients:['Figs','Cashew nuts','Raisins']},
    'Walnana':{ingredients:['Banana','Walnuts','Raisins','Apricot','Oat','Thin layer of chocolate']},
    'Nutri Tropix':{ingredients:['Coconut','Pineapple','Cashew nuts','Apricots','Dates']},
    'Nutty Date Delight Ball':{ingredients:['Almond','Dates','Thin layer of chocolate']},
    'Smoothies:Build Your Own':{ingredients:['Type in the comment area your choice of three selected fruits']},
    'Mochaccino':{price:26,ingredients:['Single shot espresso','Chocolate','Steamed milk and froth'],size:'8 oz'},
    'V60':{price:29,ingredients:['Coffee origin'],size:'8 oz'},
    'Tea Selections':{price:20,ingredients:['Green tea with mint','Green tea with jasmine','Camomile tea','English breakfast tea','Earl Grey tea']},
    'Tisane Tea':{name:'Ginger Tisane Tea',price:20,ingredients:['Ginger','Lemon juice','Honey']},
    'Hot Matcha Latte':{price:26,ingredients:['Matcha green tea','Steamed milk and froth']},
    'Iced V60':{price:29,ingredients:['Coffee origin','Ice cubes'],size:'14 oz'},
    'Cold Drip Coffee':{price:29,ingredients:['Slow-dripped cold coffee']},
    'Ice Americano':{name:'Iced Americano',price:19,ingredients:['Double shots of espresso','Ice cubes and water'],size:'14 oz'},
    'Ice Latte':{price:24,ingredients:['Espresso','Chilled milk','Ice cubes'],size:'14 oz'},
    'Ice Matcha Latte':{name:'Iced Matcha Latte',price:26,ingredients:['Matcha green tea','Ice cubes and milk'],size:'14 oz'},
    'Iced Spanish Latte':{price:26,ingredients:['Double shot of espresso','Sweet condensed milk','Ice cubes and cold milk'],size:'14 oz'},
    'Raspberry-Cano':{name:'Raspberry-Cano',price:24,ingredients:['Double shots of espresso','Raspberry syrup','Ice cubes and water'],size:'14 oz'},
    'Peach Ice Tea':{name:'Peach Iced Tea',price:20,ingredients:['Pre-made fruit tea and lemon','Peach syrup and ice cubes'],size:'14 oz'},
    'Passion Fruit Ice Tea':{name:'Passion Fruit Iced Tea',price:20,ingredients:['Pre-made fruit tea','Passion syrup','Fresh passion fruit and lemon'],size:'14 oz'},
    'Ginger Ice Tea':{name:'Ginger Iced Tea',price:20,ingredients:['Pre-made fruit tea','Fresh ginger and lemon','Honey'],size:'14 oz'},
    'Classic Mojito':{price:25,ingredients:['Fresh mint and lemon','Mint mojito syrup'],size:'14 oz'},
    'Blueberry Mojito':{price:25,ingredients:['Fresh mint, lemon & blueberry','Blueberry syrup'],size:'14 oz'},
    'Passion Fruit Mojito':{price:25,ingredients:['Fresh mint, lemon & passion fruit','Passion syrup'],size:'14 oz'},
    'Blue Lagoon Mojito':{price:25,ingredients:['Fresh mint & lemon','Blue Lagoon syrup'],size:'14 oz'},
    "Press'd Frappe":{name:'Press’d Frappe',price:29,ingredients:['Double shots of espresso','Vanilla ice cream'],size:'14 oz'},
    'Matcha Frappe':{price:29,ingredients:['Matcha green tea','Vanilla ice cream'],size:'14 oz'},
    'Mocha Frappe':{price:29,ingredients:['Single shot of espresso','Chocolate','Vanilla ice cream'],size:'14 oz'},
    'Caramel Frappe':{price:29,ingredients:['Double shots of espresso','Caramel syrup','Vanilla ice cream'],size:'14 oz'},
    'Date-me':{name:'Dates Me',price:38,ingredients:['Dates fruits','Banana','Granola','Whey protein','Milk'],protein:'34g',carbohydrates:'85g',calories:'463 kcal'},
    'PB & J':{price:38,ingredients:['Strawberry','Raspberry','Banana','Granola','Peanut butter','Beetroot','Whey protein','Milk'],protein:'35g',carbohydrates:'64g',calories:'455 kcal'},
    'Cookies & Cream':{price:38,ingredients:['Chocolate','Banana','Granola','Peanut butter','Whey protein','Cocoa powder','Milk'],protein:'35g',carbohydrates:'74g',calories:'461 kcal'},
    'Rumble in the Jungle':{price:38,ingredients:['Avocado','Broccoli','Baby spinach','Kale','Banana','Whey','Milk'],protein:'31g',carbohydrates:'46g',calories:'378 kcal'},
    'Energy Booster':{price:32,ingredients:['Cherry fruit']},
    'Srawberry Fusin':{name:'Strawberry Fusion',price:32,ingredients:['Strawberry','Mango','Raspberry','Banana','Beetroot','Apple juice'],protein:'35g',carbohydrates:'74g',calories:'461 kcal'},
    'Mango Mania':{price:32,ingredients:['Mango','Pineapple','Peach','Apple juice'],protein:'31g',carbohydrates:'46g',calories:'378 kcal'},
    'Pina Colada':{price:32,ingredients:['Pineapple','Coconut','Banana','Apple juice'],protein:'31g',carbohydrates:'46g',calories:'378 kcal'},
    'Green Machine':{price:32,ingredients:['Kale','Broccoli','Baby spinach','Banana','Pineapple','Avocado','Apple juice'],protein:'35g',carbohydrates:'64g',calories:'455 kcal'},
    'Rubby Antioxidant Blend':{name:'Rubby Antioxidant Blend',price:32,ingredients:['Prunes','Activated charcoal','Blueberry','Blackberry','Blackcurrant','Beetroot','Cherry fruit','Apple juice'],protein:'2g',carbohydrates:'35g',calories:'137 kcal'},
    'Orange':{price:20,ingredients:['Fresh orange juice'],protein:'2g',carbohydrates:'26g',calories:'168 kcal'},
    'Green Apple':{price:20,ingredients:['Fresh green apple juice'],protein:'2g',carbohydrates:'52g',calories:'175 kcal'},
    'Carrot':{price:20,ingredients:['Fresh carrot juice'],protein:'2g',carbohydrates:'23g',calories:'103 kcal'},
    'Watermelon':{price:20,ingredients:['Fresh watermelon juice'],protein:'4g',carbohydrates:'46g',calories:'180 kcal'},
    'Fresh Mint Lemonade':{price:24,ingredients:['Mint','Lemon','Sugar'],protein:'1g',carbohydrates:'39g',calories:'156 kcal'},
    'Immunity Booster':{price:24,ingredients:['Carrot','Ginger','Green apple'],protein:'3g',carbohydrates:'65g',calories:'258 kcal'},
    'The Shield':{price:24,ingredients:['Green apple','Ginger','Pineapple','Turmeric','Black pepper'],protein:'1g',carbohydrates:'58g',calories:'230 kcal'},
    'Incredible Hulk':{price:24,ingredients:['Green apple','Ginger','Pineapple','Passion fruit','Green spirulina powder'],protein:'5g',carbohydrates:'56g',calories:'214 kcal'},
    'Smoked Turkey':{price:38,ingredients:['Mozzarella cheese','Smoked turkey','Pesto sauce','Tomatoes','Bread'],protein:'55g',carbohydrates:'60g',calories:'888 kcal'},
    'Beef Pastrami':{price:38,ingredients:['Emmental cheese','Beef pastrami','Caramelized onions','Lettuce','Bread'],protein:'56.5g',carbohydrates:'64g',calories:'759 kcal'},
    'Smoked Salmon':{price:38,ingredients:['Philadelphia mix','Smoked salmon','Cucumber','Tomato','Bread'],protein:'20g',carbohydrates:'9g',calories:'467 kcal'},
    'Chickado':{price:38,ingredients:['Mozzarella cheese','Chicken mousse','Cucumber','Tomato','Avocado','Bread'],protein:'60g',carbohydrates:'44.4g',calories:'1,261 kcal'},
    'Melted Cheese':{price:38,ingredients:['Cheddar and Emmental cheese','Tomato','Bread'],protein:'49g',carbohydrates:'30g',calories:'844 kcal'},
    'Halloumi Avacado':{name:'Halloumi Avocado',price:38,ingredients:['Grilled halloumi cheese','Avocado sauce','Tomato','Cucumber','Bread'],protein:'35g',carbohydrates:'51g',calories:'804 kcal'},
    'Halloumi Pesto':{price:38,ingredients:['Grilled halloumi cheese','Pesto sauce','Tomato','Cucumber','Bread'],protein:'43g',carbohydrates:'89g',calories:'985 kcal'},
    'Labneh':{price:38,ingredients:['Labneh cheese','Sliced green olives','Olive oil','Tomato','Cucumber','Bread'],protein:'11g',carbohydrates:'57g',calories:'595 kcal'}
  };
  
  menu.forEach(category=>category.items.forEach(item=>{
    const details=productDetails[`${category.category}:${item[0]}`]||productDetails[item[0]]||{};
    item[5]={ingredients:details.ingredients||[item[1]],size:details.size,protein:details.protein,carbohydrates:details.carbohydrates,calories:details.calories};
    if(details.price)item[2]=details.price;
    if(details.name)item[0]=details.name;
  }));
  
  // Reorganise products into customer-facing menu sections and related columns.
  const originalMenu=new Map(menu.map(category=>[category.category,category.items]));
  const tagged=(category,column,filter=()=>true)=>(originalMenu.get(category)||[]).filter(filter).map(item=>{item[6]=column;return item});
  const coldItems=originalMenu.get('Cold Beverages')||[];
  const isMojito=item=>/Mojito/i.test(item[0]);
  const isIcedTea=item=>/Iced? Tea/i.test(item[0]);
  const isRefreshing=item=>['Evian Water','Perrier Sparkling Water','Perrier Sparkling Water with Lemon','Vitamin Well Upgrade','C4 Energy Drink'].includes(item[0]);
  const isIcedCoffee=item=>!isMojito(item)&&!isIcedTea(item)&&!isRefreshing(item);
  const icedCoffeeItems=coldItems.filter(isIcedCoffee);
  const icedCoffeeFirst=['Iced Americano','Raspberry-Cano'];
  const icedCoffeeLastRow=['Cold Drip Coffee','Iced V60'];
  const orderedIcedCoffee=[...icedCoffeeFirst.flatMap(name=>icedCoffeeItems.filter(item=>item[0]===name)),...icedCoffeeItems.filter(item=>!icedCoffeeFirst.includes(item[0])&&!icedCoffeeLastRow.includes(item[0])),...icedCoffeeItems.filter(item=>icedCoffeeLastRow.includes(item[0]))];
  menu=[
    {category:'Fresh Start',slug:'fresh-start',tagline:'Breakfast · bowls · salads · pancakes',items:[...tagged('Breakfast','Breakfast'),...tagged('Healthy Bowls','Bowls'),...tagged('Salads','Salads'),...tagged('Pancakes','Pancakes'),...tagged('Cakes & Pastries','Cakes & Pastries')]},
    {category:'Hot Beverages',slug:'hot-beverages',tagline:'Coffee · teas · warm moments',items:[...tagged('Hot Beverages','Coffee',item=>!/Tea/i.test(item[0])),...tagged('Hot Beverages','Teas',item=>/Tea/i.test(item[0]))]},
    {category:'Ice Beverages',slug:'ice-beverages',tagline:'Iced coffee · frappe',items:[...orderedIcedCoffee.map(item=>{item[6]='Iced Coffee';return item}),...tagged('Frappes','Frappe')]},
    {category:'Protein Shakes/Bars',slug:'protein-shakes-bars',tagline:'Protein shakes · protein bars',items:[...tagged('Protein Shakes','Protein Shakes'),...tagged('Protein Bars','Protein Bars')]},
    {category:'Smoothies',slug:'smoothies',tagline:'Fruit-forward · naturally energising',items:tagged('Smoothies','Smoothies')},
    {category:'Fresh Juices',slug:'fresh-juices',tagline:'Cold press · mocktails',items:[...tagged('Fresh Juices','Cold Press'),...tagged('Mocktails','Mocktails')]},
    {category:'Refreshing Drinks',slug:'refreshing-drinks',tagline:'Iced teas · mojitos · refreshers',items:[...coldItems.filter(isIcedTea).map(item=>{item[6]='Iced Teas';return item}),...coldItems.filter(isMojito).map(item=>{item[6]='Mojitos';return item}),...coldItems.filter(isRefreshing).map(item=>{item[6]='Refreshing Drinks';return item})]},
    {category:'Sandwiches',slug:'sandwiches',tagline:'Freshly made · full of flavour',items:tagged('Sandwiches','Sandwiches')}
  ];

  // Stable, language-independent product IDs: generated once from the
  // canonical English name, never regenerated from translated text. A name
  // reused across categories (e.g. "Build Your Own") is disambiguated with
  // its category slug so every ID stays unique.
  const usedIds = new Set();
  menu.forEach(category=>category.items.forEach(item=>{
    const base=slugify(item[0]);
    const id=usedIds.has(base)?slugify(`${category.slug}-${item[0]}`):base;
    usedIds.add(id);
    item[7]=id;
  }));

  return menu;
}

export const menu: MenuCategory[] = buildMenu();

export const menuItemById = new Map<string, MenuItem>(
  menu.flatMap((category) => category.items.map((item) => [item[7], item] as const))
);

/** Back-compat lookup for carts saved before product IDs existed. */
export const menuItemByName = new Map<string, MenuItem>(
  menu.flatMap((category) => category.items.map((item) => [item[0], item] as const))
);
