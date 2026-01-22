import {Request, Response, NextFunction} from 'express';
import AdminContact from '../models/adminContactModel';
import CustomError from '../../classes/CustomError';
import userModel from '../models/userModel';

/**
 * @module controllers/adminContactController
 * @description Controller functions for handling admin contact information displayed on the Contact page.
 * Includes adding, retrieving, updating, and deleting contact entries. Restricted to admins.
 */

/**
 * @function getContacts
 * @description Retrieves all admin contact entries.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object returning an array of contact entries.
 * @param {NextFunction} next - Express next middleware function for error handling.
 *
 * @returns {Promise<void>} Responds with:
 * - 200: Array of admin contacts.
 * - 500: If fetching fails.
 *
 * @example
 * // GET /api/v1/contact/contacts
 * getContacts(req, res, next);
 */
const getContacts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contacts = await AdminContact.find().sort({position: 1}).lean();

    const emails = contacts.map((c) => c.email);

    const users = await userModel
      .find({email: {$in: emails}})
      .select('email avatarUrl')
      .lean();

    const userMap = new Map(users.map((u) => [u.email, u.avatarUrl]));

    const enrichedContacts = contacts.map((contact) => ({
      ...contact,
      avatarUrl: userMap.get(contact.email) || null,
    }));

    res.status(200).json({contacts: enrichedContacts});
  } catch (error) {
    console.error('Error fetching admin contacts:', error);
    next(new CustomError('Failed to fetch contacts', 500));
  }
};

/**
 * @function addContact
 * @description Adds a new admin contact entry. Only accessible to admins.
 *
 * @param {Request<{}, {}, { name: string; title: string; email: string }>} req - Express request containing contact details.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function for error handling.
 *
 * @returns {Promise<void>} Responds with:
 * - 201: When the contact is successfully added.
 * - 400: If required fields are missing.
 * - 401/403: If unauthorized.
 * - 500: If saving fails.
 *
 * @example
 * // POST /api/v1/contact/contacts
 * // Body: { name: "Admin One", title: "Exchange Coordinator", email: "admin1@example.com" }
 * addContact(req, res, next);
 */
const addContact = async (
  req: Request<{}, {}, {name: string; title: string; email: string}>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = res.locals.user;
    if (!user) return next(new CustomError('Unauthorized, no user found', 401));
    if (![2, 3].includes(user.user_level_id))
      return next(new CustomError('Forbidden, not an admin', 403));

    const {name, title, email} = req.body;
    if (!name || !title || !email) {
      return next(new CustomError('All fields are required', 400));
    }

    const newContact = new AdminContact({name, title, email});
    await newContact.save();

    res
      .status(201)
      .json({message: 'Admin contact added successfully', contact: newContact});
  } catch (error) {
    console.error('Error adding admin contact:', error);
    next(new CustomError('Failed to add contact', 500));
  }
};

/**
 * @function updateContact
 * @description Updates an existing admin contact entry by ID. Only accessible to admins.
 *
 * @param {Request<{ id: string }, {}, { name?: string; title?: string; email?: string }>} req - Express request object containing contact ID and updated fields.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function for error handling.
 *
 * @returns {Promise<void>} Responds with:
 * - 200: When the contact is successfully updated.
 * - 400: If invalid data.
 * - 401/403: If unauthorized.
 * - 404: If contact not found.
 * - 500: On server errors.
 *
 * @example
 * // PUT /api/v1/contact/contacts/:id
 * // Body: { title: "Program Advisor" }
 * updateContact(req, res, next);
 */
const updateContact = async (
  req: Request<
    {id: string},
    {},
    {name?: string; title?: string; email?: string}
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = res.locals.user;
    if (!user) return next(new CustomError('Unauthorized, no user found', 401));
    if (![2, 3].includes(user.user_level_id))
      return next(new CustomError('Forbidden, not an admin', 403));

    const {id} = req.params;
    const updates = req.body;

    const updatedContact = await AdminContact.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedContact) {
      return next(new CustomError('Contact not found', 404));
    }

    res.status(200).json({
      message: 'Contact updated successfully',
      contact: updatedContact,
    });
  } catch (error) {
    console.error('Error updating admin contact:', error);
    next(new CustomError('Failed to update contact', 500));
  }
};

/**
 * @function deleteContact
 * @description Deletes an admin contact entry by ID. Only accessible to admins.
 *
 * @param {Request<{ id: string }>} req - Express request containing contact ID in params.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware for error handling.
 *
 * @returns {Promise<void>} Responds with:
 * - 200: When contact is successfully deleted.
 * - 401/403: If unauthorized.
 * - 404: If not found.
 * - 500: On server error.
 *
 * @example
 * // DELETE /api/v1/contact/contacts/:id
 * deleteContact(req, res, next);
 */
const deleteContact = async (
  req: Request<{id: string}>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = res.locals.user;
    if (!user) return next(new CustomError('Unauthorized, no user found', 401));
    if (![2, 3].includes(user.user_level_id))
      return next(new CustomError('Forbidden, not an admin', 403));

    const {id} = req.params;
    const deletedContact = await AdminContact.findByIdAndDelete(id);

    if (!deletedContact) {
      return next(new CustomError('Contact not found', 404));
    }

    res
      .status(200)
      .json({success: true, message: 'Contact deleted successfully'});
  } catch (error) {
    console.error('Error deleting admin contact:', error);
    next(new CustomError('Failed to delete contact', 500));
  }
};


const reorderContacts = async (
  req: Request<{}, {}, {orderedIds: string[]}>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = res.locals.user;
    if (!user) return next(new CustomError('Unauthorized, no user found', 401));
    if (![2, 3].includes(user.user_level_id))
      return next(new CustomError('Forbidden, not an admin', 403));

    const {orderedIds} = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return next(new CustomError('Invalid ordered IDs array', 400));
    }

    // Update each contact's position based on the new order
    for (let index = 0; index < orderedIds.length; index++) {
      const id = orderedIds[index];
      await AdminContact.findByIdAndUpdate(id, {position: index});
    }

    res.status(200).json({message: 'Contacts reordered successfully'});
  } catch (error) {
    console.error('Error reordering admin contacts:', error);
    next(new CustomError('Failed to reorder contacts', 500));
  }
};

export {getContacts, addContact, updateContact, deleteContact, reorderContacts};
