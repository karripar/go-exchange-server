import {Request, Response, NextFunction} from 'express';
// import { v4 as uuidv4 } from 'uuid';
import LinkDocument from '../../api/models/linkUploadModel';
import {
  platformInstructions,
  platformPatterns,
} from '../../utils/linkUploadHelper';


// Validating allowed source types
const validateSourceType = (sourceType: string): boolean => {
  const validSourceTypes = [
    'google_drive',
    'onedrive',
    'dropbox',
    'icloud',
    'other_url',
    'checkbox',
  ];
  return validSourceTypes.includes(sourceType);
};

// Helper to validate URL format (skip for checkbox type)
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Getting all documents & can be filtered by userId or applicationId
type LinkDocumentQuery = {
  userId?: string;
  applicationId?: string;
};
const getDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const query: LinkDocumentQuery = {};
    if (req.query.userId) query.userId = String(req.query.userId);
    if (req.query.applicationId)
      query.applicationId = String(req.query.applicationId);

    console.log('getDocuments query:', query);
    const docs = await LinkDocument.find(query).sort({addedAt: -1});
    console.log('getDocuments found:', docs.length, 'documents');
    res.json(docs);
  } catch (error) {
    next(error);
  }
};

// A generic link document
const addDocumentLink = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, url, sourceType, notes} = req.body;

    const userId = res.locals.user._id;
    console.log(userId, 'is adding a document link:', {name, url, sourceType, notes});

    if (!userId) {
      return res.status(401).json({
        error: 'User authentication required',
        details: 'userId is required',
      });
    }

    if (!name || !url || !sourceType) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'name, url, and sourceType are required',
      });
    }

    if (!validateSourceType(sourceType)) {
      return res.status(400).json({
        error: 'Invalid source type',
        validTypes: [
          'google_drive',
          'onedrive',
          'dropbox',
          'icloud',
          'other_url',
          'checkbox',
        ],
      });
    }

    // Validate URL format only for non-checkbox tasks
    if (sourceType !== 'checkbox' && !isValidUrl(url)) {
      return res.status(400).json({
        error: 'Invalid URL format',
        details: 'Must be a valid URL for document uploads',
      });
    }

    const documentLink = {
      userId,
      name,
      url,
      sourceType,
      addedAt: new Date().toISOString(),
      isAccessible: true,
      accessPermission: 'public',
      notes: notes || null,
    };

    const saved = await LinkDocument.create(documentLink);
    console.log('Document saved:', saved._id, 'userId:', saved.userId);
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error in addDocumentLink:', error);
    next(error);
  }
};


const deleteDocumentLink = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const userId = res.locals.user._id;
    console.log(userId, 'is deleting document link:', id);

    const doc = await LinkDocument.findById(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    console.log(doc.userId + ' vs ' + userId);

    if (doc.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own documents' });
    }

    await LinkDocument.findByIdAndDelete(id);
    console.log('Document deleted:', id);
    res.status(204).send();
  } catch (error) {
    console.error('Error in deleteDocumentLink:', error);
    next(error);
  }
};


// Validating a link URL
const validateDocumentLink = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {url, sourceType} = req.body;

    if (!url || !sourceType) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'url and sourceType are required',
      });
    }

    if (!validateSourceType(sourceType)) {
      return res.status(400).json({
        error: 'Invalid source type',
        validTypes: [
          'google_drive',
          'onedrive',
          'dropbox',
          'icloud',
          'other_url',
        ],
      });
    }

    const pattern = platformPatterns[sourceType];
    const isValidFormat = pattern ? pattern.test(url) : false;

    let isAccessible = false;
    let errorMessage: string | null = null;
    if (isValidFormat) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        let response;
        try {
          response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
        isAccessible = !!(response && response.ok);
        if (!isAccessible) {
          errorMessage = `URL responded with status ${
            response?.status || 'unknown'
          }`;
        }
      } catch (err) {
        isAccessible = false;
        errorMessage = `Could not access URL: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`;
      }
    } else {
      errorMessage = 'URL format does not match expected pattern for platform';
    }

    const validation = {
      isValid: isValidFormat,
      isAccessible,
      errorMessage,
      checkedAt: new Date().toISOString(),
      platform: sourceType,
    };

    res.json(validation);
  } catch (error) {
    next(error);
  }
};

//  Instructions
const getPlatformInstructions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.json({platforms: platformInstructions});
  } catch (error) {
    next(error);
  }
};

export {
  getDocuments,
  addDocumentLink,
  validateDocumentLink,
  getPlatformInstructions,
  deleteDocumentLink,
};
