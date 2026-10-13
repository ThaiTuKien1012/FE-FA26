import { RecommendedProductGroup, UtilityProfileConfig } from '../../../types/merchandiser';

export const INITIAL_UTILITY_PROFILE: UtilityProfileConfig = {
  profitMarginWeight: 40,
  unitVelocityWeight: 35,
  basketExpansionWeight: 25,
  minUtilityCutoff: 500,
  minConfidencePct: 65,
  coOccurrenceThreshold: 180
};

export const INITIAL_RECOMMENDED_GROUPS: RecommendedProductGroup[] = [
  {
    id: 'grp-01',
    groupCode: 'REC-014',
    groupName: 'Summer Drink Set',
    itemsCount: 4,
    type: 'Cross-sell',
    utilityScore: 1250,
    status: 'Pending',
    sourceMiningRun: '#0024',
    miningRunDetails: 'EFIM',
    sourceDataPeriod: 'Sales Q3 2026',
    expectedBasketLiftPct: 24.5,
    projectedMarginPct: 41.2,
    coOccurrenceCount: 412,
    suggestedPlacement: 'Beverages + Snacks',
    utilityThresholdNote: 'Utility threshold > 980',
    notes: 'Proposed cross-sell recommendation from latest high-utility mining run.',
    items: [
      { id: 'it-01', name: 'Orange Juice 1L', category: 'BEVERAGES', sku: 'SKU: DRK-101', iconType: 'juice', unitPrice: 42000, utilityContribution: 420, marginPct: 48 },
      { id: 'it-02', name: 'Sparkling Water 500ml', category: 'BEVERAGES', sku: 'SKU: DRK-114', iconType: 'water', unitPrice: 22000, utilityContribution: 310, marginPct: 39 },
      { id: 'it-03', name: 'Potato Chips 70g', category: 'SNACKS', sku: 'SKU: SNK-043', iconType: 'snack', unitPrice: 28000, utilityContribution: 260, marginPct: 35 },
      { id: 'it-04', name: 'Energy Drink 250ml', category: 'BEVERAGES', sku: 'SKU: DRK-091', iconType: 'energy', unitPrice: 32000, utilityContribution: 260, marginPct: 43 }
    ]
  },
  {
    id: 'grp-02',
    groupName: 'Snack Combo',
    itemsCount: 3,
    type: 'Bought together',
    utilityScore: 980,
    status: 'Pending',
    sourceMiningRun: '#0024',
    miningRunDetails: 'EFIM · Sales Q3',
    expectedBasketLiftPct: 18.2,
    projectedMarginPct: 37.5,
    coOccurrenceCount: 345,
    notes: 'Frequent evening basket addition for convenience store customers.',
    items: [
      { id: 'it-05', name: 'Roasted Salted Cashews 150g', category: 'Snacks', unitPrice: 72000, utilityContribution: 410, marginPct: 42 },
      { id: 'it-06', name: 'Dried Fruit Tropical Medley 120g', category: 'Snacks', unitPrice: 46000, utilityContribution: 320, marginPct: 36 },
      { id: 'it-07', name: 'Organic Jasmine Green Tea 500ml', category: 'Tea', unitPrice: 19000, utilityContribution: 250, marginPct: 34 }
    ]
  },
  {
    id: 'grp-03',
    groupName: 'Breakfast Set',
    itemsCount: 3,
    type: 'Cross-sell',
    utilityScore: 875,
    status: 'Approved',
    sourceMiningRun: '#0024',
    miningRunDetails: 'EFIM · Sales Q3',
    expectedBasketLiftPct: 19.8,
    projectedMarginPct: 39.0,
    coOccurrenceCount: 520,
    layoutTarget: 'Layout B',
    notes: 'Approved for entrance gondola display 07:00 - 10:30 AM.',
    items: [
      { id: 'it-08', name: 'Freshly Baked Butter Croissant', category: 'Bakery', unitPrice: 30000, utilityContribution: 330, marginPct: 44 },
      { id: 'it-09', name: 'Vanilla Latte Macchiato 280ml', category: 'Coffee', unitPrice: 42000, utilityContribution: 315, marginPct: 38 },
      { id: 'it-10', name: 'Low Sugar Strawberry Jam Jar', category: 'Spreads', unitPrice: 38000, utilityContribution: 230, marginPct: 35 }
    ]
  },
  {
    id: 'grp-04',
    groupName: 'Healthy Life Set',
    itemsCount: 4,
    type: 'Banner',
    utilityScore: 760,
    status: 'Pending',
    sourceMiningRun: '#0024',
    miningRunDetails: 'EFIM · Sales Q3',
    expectedBasketLiftPct: 15.4,
    projectedMarginPct: 35.8,
    coOccurrenceCount: 280,
    notes: 'Targeting wellness shoppers; candidate for online banner or mobile app feature.',
    items: [
      { id: 'it-11', name: 'Rolled Oats & Granola Crunch 350g', category: 'Cereals', unitPrice: 85000, utilityContribution: 280, marginPct: 38 },
      { id: 'it-12', name: 'Plain Greek Yogurt Cup 200g', category: 'Dairy', unitPrice: 28000, utilityContribution: 210, marginPct: 33 },
      { id: 'it-13', name: 'Wildflower Pure Honey 180ml', category: 'Health', unitPrice: 89000, utilityContribution: 150, marginPct: 40 },
      { id: 'it-14', name: 'Raw Organic Chia Seeds 100g', category: 'Superfoods', unitPrice: 45000, utilityContribution: 120, marginPct: 32 }
    ]
  },
  {
    id: 'grp-05',
    groupName: 'Tet Gift Set',
    itemsCount: 5,
    type: 'Bought together',
    utilityScore: 630,
    status: 'Approved',
    sourceMiningRun: '#0024',
    miningRunDetails: 'EFIM · Sales Q3',
    expectedBasketLiftPct: 32.1,
    projectedMarginPct: 45.0,
    coOccurrenceCount: 195,
    layoutTarget: 'Layout B',
    notes: 'Premium seasonal bundle tested in trial stores.',
    items: [
      { id: 'it-15', name: 'High-Mountain Oolong Tea Gift Tin', category: 'Specialty Tea', unitPrice: 155000, utilityContribution: 190, marginPct: 48 },
      { id: 'it-16', name: 'Single Origin Dark Chocolate 72%', category: 'Confectionery', unitPrice: 85000, utilityContribution: 140, marginPct: 45 },
      { id: 'it-17', name: 'Roasted Whole Macadamia Nuts 200g', category: 'Premium Nuts', unitPrice: 135000, utilityContribution: 120, marginPct: 44 },
      { id: 'it-18', name: 'Natural Bird Nest Drink 6-Pack', category: 'Wellness', unitPrice: 220000, utilityContribution: 100, marginPct: 42 },
      { id: 'it-19', name: 'Sugared Lotus Seeds 150g', category: 'Traditional', unitPrice: 55000, utilityContribution: 80, marginPct: 46 }
    ]
  },
  {
    id: 'grp-06',
    groupName: 'Office Afternoon Energy',
    itemsCount: 3,
    type: 'Cross-sell',
    utilityScore: 610,
    status: 'Pending',
    sourceMiningRun: '#0024',
    miningRunDetails: 'EFIM · Sales Q3',
    expectedBasketLiftPct: 14.2,
    projectedMarginPct: 36.4,
    coOccurrenceCount: 290,
    notes: 'Pairs iced tea with baked biscuits for corporate pantry run.',
    items: [
      { id: 'it-20', name: 'Sparkling Peach Tea Can 330ml', category: 'Beverages', unitPrice: 24000, utilityContribution: 240, marginPct: 36 },
      { id: 'it-21', name: 'Butter Shortbread Cookies 120g', category: 'Bakery', unitPrice: 42000, utilityContribution: 210, marginPct: 38 },
      { id: 'it-22', name: 'Dark Roast Drip Bag Coffee Box', category: 'Coffee', unitPrice: 65000, utilityContribution: 160, marginPct: 35 }
    ]
  },
  {
    id: 'grp-07',
    groupName: 'Weekend BBQ Party',
    itemsCount: 5,
    type: 'Bought together',
    utilityScore: 590,
    status: 'Pending',
    sourceMiningRun: '#0024',
    miningRunDetails: 'EFIM · Sales Q3',
    expectedBasketLiftPct: 26.8,
    projectedMarginPct: 32.5,
    coOccurrenceCount: 185,
    notes: 'Friday/Saturday peak basket driver.',
    items: [
      { id: 'it-23', name: 'Smoky Barbecue Marinade Sauce', category: 'Sauces', unitPrice: 48000, utilityContribution: 180, marginPct: 34 },
      { id: 'it-24', name: 'Premium Briquette Charcoal 3kg', category: 'Hardware', unitPrice: 65000, utilityContribution: 140, marginPct: 30 },
      { id: 'it-25', name: 'Alum Foil Heavy Duty Roll 10m', category: 'Household', unitPrice: 38000, utilityContribution: 110, marginPct: 32 },
      { id: 'it-26', name: 'Spicy Garlic Salt Grinder', category: 'Spices', unitPrice: 35000, utilityContribution: 90, marginPct: 35 },
      { id: 'it-27', name: 'Cold Craft Lager 4-Pack', category: 'Beer', unitPrice: 112000, utilityContribution: 70, marginPct: 31 }
    ]
  },
  {
    id: 'grp-08',
    groupName: 'Quick Meal Grab',
    itemsCount: 3,
    type: 'Impulse',
    utilityScore: 565,
    status: 'Approved',
    sourceMiningRun: '#0024',
    miningRunDetails: 'EFIM · Sales Q3',
    expectedBasketLiftPct: 12.5,
    projectedMarginPct: 38.0,
    coOccurrenceCount: 430,
    layoutTarget: 'Layout B',
    notes: 'Ready-to-eat chiller placement.',
    items: [
      { id: 'it-28', name: 'Smoked Ham & Cheese Baguette', category: 'Fresh Food', unitPrice: 42000, utilityContribution: 230, marginPct: 40 },
      { id: 'it-29', name: 'Mineral Water Electrolytes 500ml', category: 'Beverages', unitPrice: 15000, utilityContribution: 195, marginPct: 38 },
      { id: 'it-30', name: 'Sliced Fresh Apple Cup 100g', category: 'Fruits', unitPrice: 22000, utilityContribution: 140, marginPct: 36 }
    ]
  },
  {
    id: 'grp-09',
    groupName: 'Home Cinema Treats',
    itemsCount: 4,
    type: 'Bought together',
    utilityScore: 540,
    status: 'Pending',
    sourceMiningRun: '#0024',
    miningRunDetails: 'EFIM · Sales Q3',
    expectedBasketLiftPct: 21.0,
    projectedMarginPct: 41.5,
    coOccurrenceCount: 220,
    notes: 'High margin impulse cluster near checkouts.',
    items: [
      { id: 'it-31', name: 'Caramel Glazed Popcorn Tub', category: 'Snacks', unitPrice: 52000, utilityContribution: 210, marginPct: 45 },
      { id: 'it-32', name: 'Milk Chocolate Coated Almonds', category: 'Confectionery', unitPrice: 68000, utilityContribution: 160, marginPct: 42 },
      { id: 'it-33', name: 'Zero Calorie Ginger Ale Can', category: 'Beverages', unitPrice: 20000, utilityContribution: 100, marginPct: 38 },
      { id: 'it-34', name: 'Sour Gummy Worms Pack 90g', category: 'Candy', unitPrice: 26000, utilityContribution: 70, marginPct: 41 }
    ]
  },
  {
    id: 'grp-10',
    groupName: 'Italian Pasta Dinner',
    itemsCount: 4,
    type: 'Cross-sell',
    utilityScore: 520,
    status: 'Approved',
    sourceMiningRun: '#0024',
    miningRunDetails: 'EFIM · Sales Q3',
    expectedBasketLiftPct: 28.4,
    projectedMarginPct: 34.0,
    coOccurrenceCount: 310,
    layoutTarget: 'Layout B',
    notes: 'Co-located on endcap aisle 3.',
    items: [
      { id: 'it-35', name: 'Bronze-Cut Spaghetti 500g', category: 'Dry Grocery', unitPrice: 42000, utilityContribution: 180, marginPct: 33 },
      { id: 'it-36', name: 'Sundried Tomato Basil Sauce 350g', category: 'Sauces', unitPrice: 65000, utilityContribution: 160, marginPct: 36 },
      { id: 'it-37', name: 'Extra Virgin Olive Oil 250ml', category: 'Oils', unitPrice: 110000, utilityContribution: 110, marginPct: 32 },
      { id: 'it-38', name: 'Grated Parmigiano Flakes 80g', category: 'Dairy', unitPrice: 75000, utilityContribution: 70, marginPct: 35 }
    ]
  },
  {
    id: 'grp-11',
    groupName: 'Late Night Study Pack',
    itemsCount: 3,
    type: 'Impulse',
    utilityScore: 505,
    status: 'Pending',
    sourceMiningRun: '#0024',
    miningRunDetails: 'EFIM · Sales Q3',
    expectedBasketLiftPct: 16.5,
    projectedMarginPct: 39.5,
    coOccurrenceCount: 260,
    notes: 'Exam period basket driver.',
    items: [
      { id: 'it-39', name: 'Energy Taurine Drink Can 250ml', category: 'Energy', unitPrice: 26000, utilityContribution: 220, marginPct: 40 },
      { id: 'it-40', name: 'High Protein Peanut Bar 50g', category: 'Snacks', unitPrice: 32000, utilityContribution: 180, marginPct: 42 },
      { id: 'it-41', name: 'Refreshing Mint Drops Pocket Pack', category: 'Candy', unitPrice: 18000, utilityContribution: 105, marginPct: 37 }
    ]
  },
  {
    id: 'grp-12',
    groupName: 'Tropical Smoothie Kit',
    itemsCount: 4,
    type: 'Banner',
    utilityScore: 490,
    status: 'Approved',
    sourceMiningRun: '#0024',
    miningRunDetails: 'EFIM · Sales Q3',
    expectedBasketLiftPct: 22.0,
    projectedMarginPct: 36.5,
    coOccurrenceCount: 190,
    layoutTarget: 'Promotional Endcap',
    notes: 'Featured in summer catalog.',
    items: [
      { id: 'it-42', name: 'Frozen Mango & Passionfruit Mix', category: 'Frozen', unitPrice: 58000, utilityContribution: 180, marginPct: 38 },
      { id: 'it-43', name: 'Almond Milk Unsweetened 1L', category: 'Dairy Alt', unitPrice: 62000, utilityContribution: 150, marginPct: 35 },
      { id: 'it-44', name: 'Organic Coconut Flakes 100g', category: 'Baking', unitPrice: 36000, utilityContribution: 90, marginPct: 36 },
      { id: 'it-45', name: 'Flaxseed Meal 150g', category: 'Health', unitPrice: 42000, utilityContribution: 70, marginPct: 37 }
    ]
  }
];
