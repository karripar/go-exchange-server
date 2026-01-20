/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import Story from '../models/storyModel';

import type { StoryFilters, CreateStoryRequest, ExchangeStory, CountriesResponse, PaginationOptions } from 'va-hybrid-types/contentTypes';


function buildQuery(filters: StoryFilters = {}, onlyApproved = true): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  if (onlyApproved) query.isApproved = true;

  if (filters.country) query.country = filters.country;
  if (filters.university) query.university = filters.university;
  if (filters.search) query.$text = { $search: filters.search };
  if (filters.isFeatured !== undefined) query.featured = filters.isFeatured;

  return query;
}

async function fetchStoriesDb(
  filters: StoryFilters = {},
  options: PaginationOptions = {},
  onlyApproved = true
): Promise<ExchangeStory[]> {
  const query = buildQuery(filters, onlyApproved);

  // Default sort by newest first
  const sort: Record<string, 1 | -1> = { createdAt: -1 };

  const offset = options.offset ? Number(options.offset) : 0;
  const limit = options.limit ? Number(options.limit) : 12;

  const stories = await Story.find(query).sort(sort).skip(offset).limit(limit).lean<ExchangeStory[]>();

  return stories.map((story: any) => ({
    ...story,
    id: story._id.toString()
  })) as ExchangeStory[];
}

// One story
async function getStoryByIdDb(id: string): Promise<ExchangeStory | null> {
  const story = await Story.findById(id).lean();
  if (!story) return null;

  const { _id, ...rest } = story as any;

  return {
    id: _id.toString(),
    ...rest
  } as unknown as ExchangeStory;
}

async function createStoryDb(data: CreateStoryRequest, userId: string): Promise<ExchangeStory> {
  const doc = await Story.create({
    ...data,
    createdBy: userId,
    isApproved: false,
  });

  const { _id, ...rest } = doc.toObject();
  return { id: _id.toString(), ...rest } as unknown as ExchangeStory;
}

// Update story
async function updateStoryDb(id: string, data: Partial<CreateStoryRequest>) {
  return Story.findByIdAndUpdate(id, data, { new: true }).lean();
}

// Delete story
async function deleteStoryDb(id: string) {
  return Story.findByIdAndDelete(id).lean();
}

// Approve story
async function approveStoryDb(id: string) {
  return Story.findByIdAndUpdate(id, { isApproved: true }, { new: true }).lean();
}

// Country counts
async function getCountriesWithCountsDb(): Promise<CountriesResponse['countries']> {
  const pipeline = [
    { $match: { isApproved: true } },
    {
      $group: {
        _id: { country: '$country', university: '$university' },
        count: { $sum: 1 },
      },
    },
  ];

  const results = await Story.aggregate(pipeline);

  const map: Record<string, { count: number; cities: Record<string, number> }> = {};

  results.forEach((r: any) => {
    const { country, university } = r._id;
    if (!map[country]) map[country] = { count: 0, cities: {} };
    map[country].count += r.count;
    map[country].cities[university] = (map[country].cities[university] || 0) + r.count;
  });

  return Object.entries(map).map(([country, data]) => ({
    country,
    count: data.count,
    cities: Object.entries(data.cities).map(([city, count]) => ({
      city,
      count,
    })),
  }));
}



const createStoryHandler = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user?._id;

    if (!userId) {
      console.error('createStoryHandler: No user ID found in res.locals.user');
      return res.status(401).json({ error: 'User authentication required' });
    }

    console.log('Creating story for user:', userId);
    const story = await createStoryDb(req.body, userId.toString());
    console.log('Story created successfully:', story.id);
    res.status(201).json({ story });
  } catch (error) {
    console.error('createStoryHandler error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

const getApprovedStoriesHandler = async (req: Request, res: Response) => {
  try {
    const filters = req.query as unknown as StoryFilters;
    const options: PaginationOptions = {
      offset: req.query.offset ? Number(req.query.offset) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 12,
    };

    const stories = await fetchStoriesDb(filters, options, true);
    const total = await Story.countDocuments(buildQuery(filters, true));

    res.json({
      stories,
      total,
      hasMore: total > (options.offset ?? 0) + (options.limit ?? 12),
    });
  } catch (error) {
    console.error('getApprovedStoriesHandler error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

// Admin: all stories
const getAllStoriesHandler = async (req: Request, res: Response) => {
  try {
    const filters = req.query as unknown as StoryFilters;
    const options: PaginationOptions = {
      offset: req.query.offset ? Number(req.query.offset) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 100,
    };

    const stories = await fetchStoriesDb(filters, options, false);
    const total = await Story.countDocuments(buildQuery(filters, false));

    res.json({
      stories,
      total,
      hasMore: total > (options.offset ?? 0) + (options.limit ?? 100),
    });
  } catch (error) {
    console.error('getAllStoriesHandler error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

const getStoryByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ error: 'Invalid story ID provided' });
    }

    const story = await getStoryByIdDb(id as string);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json({ story });
  } catch (error) {
    console.error('getStoryByIdHandler error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

const updateStoryHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ error: 'Invalid story ID provided' });
    }

    const updated = await updateStoryDb(id as string, req.body);

    if (!updated) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({ story: updated });
  } catch (error) {
    console.error('updateStoryHandler error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

const deleteStoryHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ error: 'Invalid story ID provided' });
    }

    const deleted = await deleteStoryDb(id as string);

    if (!deleted) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({ story: deleted });
  } catch (error) {
    console.error('deleteStoryHandler error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

const approveStoryHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ error: 'Invalid story ID provided' });
    }

    const approved = await approveStoryDb(id as string);

    if (!approved) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({ story: approved });
  } catch (error) {
    console.error('approveStoryHandler error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

const getCountriesHandler = async (req: Request, res: Response) => {
  try {
    const countries = await getCountriesWithCountsDb();
    res.json({ countries });
  } catch (error) {
    console.error('getCountriesHandler error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};



export {
  createStoryHandler,
  getApprovedStoriesHandler,
  getAllStoriesHandler,
  getStoryByIdHandler,
  updateStoryHandler,
  deleteStoryHandler,
  approveStoryHandler,
  getCountriesHandler,
};
