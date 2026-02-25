import { Router } from "express";
import {getErasmusGrantTypes, searchGrants} from "../controllers/profileController";


/**
 * @apiDefine GrantsGroup Grants
 * Grant application and management (Erasmus+, Kela, etc.)
 */

/**
 * @apiDefine token Token is required in the form of Bearer token
 * @apiHeader {String} Authorization Bearer token
 * @apiHeaderExample {json} Header-Example:
 * {
 *  "Authorization": "Bearer <token>"
 * }
 */

/**
 * @apiDefine unauthorized Unauthorized
 * @apiError (401) {String} Unauthorized Missing or invalid authentication token
 * @apiErrorExample {json} Unauthorized:
 * {
 *  "message": "Unauthorized"
 * }
 */

const router = Router();


router.get(
  /**
   * @api {get} /grants/erasmus/types Get Erasmus+ grant types
   * @apiName GetErasmusGrantTypes
   * @apiGroup GrantsGroup
   * @apiVersion 1.0.0
   * @apiDescription Retrieve available Erasmus+ grant types
   * @apiPermission none
   *
   * @apiSuccess (200) {Object[]} types List of Erasmus+ grant types
   * @apiSuccess (200) {String} types.id Grant type ID
   * @apiSuccess (200) {String} types.name Grant type name
   * @apiSuccess (200) {String} types.description Description
   * @apiSuccess (200) {Number} types.amount Grant amount
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * [
   *  {
   *    "id": "studies",
   *    "name": "Studies Grant",
   *    "description": "Grant for study mobility",
   *    "amount": 600
   *  }
   * ]
   */
  "/erasmus/types",
  getErasmusGrantTypes
);





router.get(
  /**
   * @api {get} /grants/search Search grants
   * @apiName SearchGrants
   * @apiGroup GrantsGroup
   * @apiVersion 1.0.0
   * @apiDescription Search for available grants based on criteria
   * @apiPermission none
   *
   * @apiQuery {String} [country] Filter by destination country
   * @apiQuery {String} [type] Filter by grant type
   * @apiQuery {Number} [minAmount] Minimum grant amount
   *
   * @apiSuccess (200) {Object[]} grants List of matching grants
   * @apiSuccess (200) {String} grants.id Grant ID
   * @apiSuccess (200) {String} grants.name Grant name
   * @apiSuccess (200) {Number} grants.amount Grant amount
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * [
   *  {
   *    "id": "grant1",
   *    "name": "Erasmus+ Studies",
   *    "amount": 600
   *  }
   * ]
   */
  "/search",
  searchGrants
);



export default router;
