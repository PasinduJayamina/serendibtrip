/**
 * Budget Allocation Service
 * Handles intelligent budget distribution across expense categories
 */

// Expense categories with typical allocation percentages for Sri Lanka travel
const EXPENSE_CATEGORIES = {
  accommodation: {
    label: 'Accommodation',
    icon: '🏨',
    defaultPercentage: 35, // 35% of budget
    perDayMin: 3000, // LKR minimum per day
    perDayMax: 50000, // LKR maximum per day
  },
  food: {
    label: 'Food & Dining',
    icon: '🍛',
    defaultPercentage: 25, // 25% of budget
    perDayMin: 1500, // LKR minimum per day
    perDayMax: 10000, // LKR maximum per day
    mealsPerDay: 3,
  },
  transportation: {
    label: 'Transportation',
    icon: '🚗',
    defaultPercentage: 20, // 20% of budget
    perDayMin: 1000, // LKR minimum per day
    perDayMax: 15000, // LKR maximum per day
  },
  activities: {
    label: 'Activities & Entry Fees',
    icon: '🎫',
    defaultPercentage: 15, // 15% of budget
    perDayMin: 500, // LKR minimum per day
    perDayMax: 10000, // LKR maximum per day
  },
  misc: {
    label: 'Miscellaneous',
    icon: '💰',
    defaultPercentage: 5, // 5% for emergencies/tips
    perDayMin: 500,
    perDayMax: 5000,
  },
};

/**
 * Calculate budget allocation based on trip parameters
 * @param {Object} params - Trip parameters
 * @returns {Object} Budget allocation by category and day
 */
export const calculateBudgetAllocation = ({
  totalBudget,
  duration,
  groupSize,
  destination,
  interests = [],
  savedItems = [],
}) => {
  const budgetPerPerson = totalBudget / groupSize;
  const dailyBudgetPerPerson = budgetPerPerson / duration;

  // Calculate actual expenses from saved items
  let allocatedActivityCost = 0;
  let allocatedFoodCost = 0;

  savedItems.forEach((item) => {
    const cost = item.cost || item.entryFee || 0;
    if (item.type === 'restaurant') {
      allocatedFoodCost += cost * groupSize;
    } else {
      allocatedActivityCost += cost * groupSize;
    }
  });

  // Adjust percentages based on interests
  let adjustedCategories = { ...EXPENSE_CATEGORIES };

  // If adventure/wildlife heavy, increase activity budget
  if (interests.includes('adventure') || interests.includes('wildlife')) {
    adjustedCategories.activities.defaultPercentage += 5;
    adjustedCategories.accommodation.defaultPercentage -= 5;
  }

  // If food/culture heavy, increase food budget
  if (interests.includes('food') || interests.includes('culture')) {
    adjustedCategories.food.defaultPercentage += 5;
    adjustedCategories.misc.defaultPercentage -= 5;
  }

  // Calculate allocations
  const allocation = {};
  let remainingBudget = totalBudget;

  // First, account for already committed expenses
  const committedExpenses = allocatedActivityCost + allocatedFoodCost;
  remainingBudget -= committedExpenses;

  // Distribute remaining budget
  Object.entries(adjustedCategories).forEach(([key, category]) => {
    let categoryBudget;

    if (key === 'activities') {
      // Use remaining percentage minus already allocated
      categoryBudget = Math.max(
        0,
        (totalBudget * category.defaultPercentage) / 100 - allocatedActivityCost
      );
    } else if (key === 'food') {
      categoryBudget = Math.max(
        0,
        (totalBudget * category.defaultPercentage) / 100 - allocatedFoodCost
      );
    } else {
      categoryBudget = (remainingBudget * category.defaultPercentage) / 100;
    }

    const dailyBudget = categoryBudget / duration;
    const dailyPerPerson = dailyBudget / groupSize;

    allocation[key] = {
      ...category,
      total: Math.round(categoryBudget),
      perDay: Math.round(dailyBudget),
      perDayPerPerson: Math.round(dailyPerPerson),
      allocated:
        key === 'activities'
          ? allocatedActivityCost
          : key === 'food'
          ? allocatedFoodCost
          : 0,
      remaining: Math.round(categoryBudget),
    };
  });

  // Calculate day-by-day breakdown
  const dailyBreakdown = [];
  for (let day = 1; day <= duration; day++) {
    const dayExpenses = {
      day,
      date: null, // Will be set based on start date
      categories: {},
      total: 0,
    };

    Object.entries(allocation).forEach(([key, cat]) => {
      dayExpenses.categories[key] = {
        budget: cat.perDay,
        spent: 0,
        remaining: cat.perDay,
      };
      dayExpenses.total += cat.perDay;
    });

    dailyBreakdown.push(dayExpenses);
  }

  return {
    totalBudget,
    duration,
    groupSize,
    perPerson: Math.round(budgetPerPerson),
    perDay: Math.round(totalBudget / duration),
    perDayPerPerson: Math.round(dailyBudgetPerPerson),
    categories: allocation,
    dailyBreakdown,
    committedExpenses: Math.round(committedExpenses),
    remainingBudget: Math.round(remainingBudget),
    utilizationPercentage: Math.round((committedExpenses / totalBudget) * 100),
  };
};

/**
 * Categorize an expense item
 * @param {Object} item - The item to categorize
 * @returns {string} Category key
 */
export const categorizeExpense = (item) => {
  if (item.type === 'restaurant' || item.category === 'food') {
    return 'food';
  }

  if (
    item.category === 'accommodation' ||
    item.name?.toLowerCase().includes('hotel') ||
    item.name?.toLowerCase().includes('resort') ||
    item.name?.toLowerCase().includes('stay') ||
    item.name?.toLowerCase().includes('homestay') ||
    item.name?.toLowerCase().includes('hostel') ||
    item.name?.toLowerCase().includes('lodge') ||
    item.name?.toLowerCase().includes('inn') ||
    item.name?.toLowerCase().includes('villa')
  ) {
    return 'accommodation';
  }

  if (
    item.category === 'transportation' ||
    item.name?.toLowerCase().includes('taxi') ||
    item.name?.toLowerCase().includes('transfer') ||
    item.name?.toLowerCase().includes('train') ||
    item.name?.toLowerCase().includes('bus') ||
    item.name?.toLowerCase().includes('transport') ||
    item.name?.toLowerCase().includes('tuk-tuk')
  ) {
    return 'transportation';
  }

  // Food & dining keyword matching
  const nameLower = item.name?.toLowerCase() || '';
  if (
    nameLower.includes('restaurant') ||
    nameLower.includes('ice cream') ||
    nameLower.includes('cafe') ||
    nameLower.includes('café') ||
    nameLower.includes('coffee') ||
    nameLower.includes('bakery') ||
    nameLower.includes('bistro') ||
    nameLower.includes('dining') ||
    nameLower.includes('eatery') ||
    nameLower.includes('tiffin') ||
    nameLower.includes('food court') ||
    nameLower.includes('juice') ||
    nameLower.includes('dessert') ||
    nameLower.includes('kottu') ||
    nameLower.includes('rice & curry')
  ) {
    return 'food';
  }

  // Default to activities for attractions, tours, etc.
  return 'activities';
};

/**
 * Get expense category info
 * @param {string} categoryKey - Category key
 * @returns {Object} Category information
 */
export const getCategoryInfo = (categoryKey) => {
  return EXPENSE_CATEGORIES[categoryKey] || EXPENSE_CATEGORIES.misc;
};

/**
 * Get all expense categories
 * @returns {Object} All categories
 */
export const getAllCategories = () => EXPENSE_CATEGORIES;

/**
 * Calculate if an item fits within budget
 * @param {Object} params - Check parameters
 * @returns {Object} Fit analysis
 */
export const checkBudgetFit = ({ item, currentAllocation, category }) => {
  const itemCost = item.cost || item.entryFee || 0;
  const categoryData = currentAllocation.categories[category];

  if (!categoryData) {
    return {
      fits: true,
      warning: null,
    };
  }

  const remainingBudget = categoryData.remaining;
  const fits = itemCost <= remainingBudget;

  return {
    fits,
    itemCost,
    remainingBudget,
    overBudgetBy: fits ? 0 : itemCost - remainingBudget,
    warning: fits
      ? null
      : `This item exceeds your ${categoryData.label} budget by LKR ${(
          itemCost - remainingBudget
        ).toLocaleString()}`,
    suggestion: fits
      ? null
      : 'Consider adjusting your budget allocation or choosing a more affordable option.',
  };
};

export default {
  calculateBudgetAllocation,
  categorizeExpense,
  getCategoryInfo,
  getAllCategories,
  checkBudgetFit,
};
