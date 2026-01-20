import { Request, Response, NextFunction } from "express";
import { Budget } from "../../models/GrantModels";
import { budgetCategories } from "../../../utils/constants";
import { getUserFromRequest } from "../../../utils/authHelpers";

// Get budget categories
export const getBudgetCategories = (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ categories: budgetCategories });
  } catch (error) {
    next(error);
  }
};

// Save or update user budget
export const saveOrUpdateBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, destination, exchangeProgramId, categories, totalAmount } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_USER_ID', message: 'User ID is required' }
      });
    }

    if (!categories) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_BUDGET_DATA', message: 'Categories are required' }
      });
    }

    // Validate category amounts
    for (const [key, value] of Object.entries(categories)) {
      if (typeof value === 'object' && value !== null) {
        const categoryData = value as { amount?: number; notes?: string };
        if (categoryData.amount !== undefined && categoryData.amount < 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_BUDGET_DATA',
              message: `Amount for ${key} must be >= 0`
            }
          });
        }
        if (categoryData.notes && categoryData.notes.length > 500) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_BUDGET_DATA',
              message: `Notes for ${key} exceed 500 characters`
            }
          });
        }
      }
    }

    // Calculate total if not provided
    let calculatedTotal = totalAmount || 0;
    if (!totalAmount) {
      for (const value of Object.values(categories)) {
        if (typeof value === 'object' && value !== null) {
          const categoryData = value as { amount?: number };
          calculatedTotal += categoryData.amount || 0;
        }
      }
    }

    const budgetData = {
      userId,
      destination: destination || '',
      exchangeProgramId,
      categories,
      totalAmount: calculatedTotal
    };

    const budget = await Budget.findOneAndUpdate(
      { userId },
      budgetData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      budgetId: budget._id.toString(),
      message: 'Budget saved successfully',
      data: budget
    });
  } catch (error) {
    next(error);
  }
};

// Get user budget
export const getUserBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { destination, latest } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_USER_ID', message: 'User ID is required' }
      });
    }

    const query: { userId: string; destination?: string } = { userId: Array.isArray(userId) ? userId[0] : userId };
    if (destination) {
      query.destination = Array.isArray(destination) ? destination.join(", ") : destination as string;
    }

    let budget;
    if (latest === 'true') {
      budget = await Budget.findOne(query).sort({ updatedAt: -1 });
    } else {
      budget = await Budget.findOne(query);
    }

    if (!budget) {
      return res.json({
        success: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: budget
    });
  } catch (error) {
    next(error);
  }
};

// Get budget history
export const getBudgetHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_USER_ID', message: 'User ID is required' }
      });
    }

    const budgets = await Budget.find({ userId })
      .select('_id destination totalAmount createdAt')
      .sort({ createdAt: -1 });

    const history = budgets.map(budget => ({
      budgetId: budget._id.toString(),
      destination: budget.destination,
      totalAmount: budget.totalAmount,
      createdAt: budget.createdAt
    }));

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

// Delete budget
export const deleteBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { budgetId } = req.params;

    if (!budgetId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_BUDGET_DATA', message: 'Budget ID is required' }
      });
    }

    const budget = await Budget.findByIdAndDelete(budgetId);

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: { code: 'BUDGET_NOT_FOUND', message: 'Budget not found' }
      });
    }

    res.json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Legacy endpoints for backward compatibility
export const createOrUpdateBudgetEstimate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserFromRequest(req);
    const { destination, categories, exchangeProgramId } = req.body;

    if (!categories) {
      return res.status(400).json({ error: "Categories are required" });
    }

    // Calculate totalAmount
    let totalAmount = 0;
    for (const key in categories) {
      if (categories[key]?.amount) {
        totalAmount += Number(categories[key].amount);
      }
    }

    const budgetData = {
      userId,
      destination: destination || '',
      exchangeProgramId,
      categories,
      totalAmount
    };

    const budget = await Budget.findOneAndUpdate(
      { userId },
      budgetData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(budget);
  } catch (error) {
    next(error);
  }
};

export const getBudgetEstimate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserFromRequest(req);

    const budget = await Budget.findOne({ userId });

    if (!budget) {
      return res.json({
        categories: {
          matkakulut: { amount: 0, notes: '' },
          vakuutukset: { amount: 0, notes: '' },
          asuminen: { amount: 0, notes: '' },
          ruoka_ja_arki: { amount: 0, notes: '' },
          opintovalineet: { amount: 0, notes: '' }
        },
        totalAmount: 0
      });
    }

    res.json(budget);
  } catch (error) {
    next(error);
  }
};
