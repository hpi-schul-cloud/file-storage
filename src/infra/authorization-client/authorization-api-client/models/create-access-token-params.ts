/* tslint:disable */
/* eslint-disable */
/**
 * Schulcloud-Verbund-Software Server API
 * This is v3 of Schulcloud-Verbund-Software Server. Checkout /docs for v1.
 *
 * The version of the OpenAPI document: 3.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


// May contain unused imports in some cases
// @ts-ignore
import type { AuthorizationContextParams } from './authorization-context-params';

/**
 * 
 * @export
 * @interface CreateAccessTokenParams
 */
export interface CreateAccessTokenParams {
    /**
     * 
     * @type {AuthorizationContextParams}
     * @memberof CreateAccessTokenParams
     */
    'context': AuthorizationContextParams;
    /**
     * The entity or domain object the operation should be performed on.
     * @type {string}
     * @memberof CreateAccessTokenParams
     */
    'referenceType': CreateAccessTokenParamsReferenceType;
    /**
     * The id of the entity/domain object of the defined referenceType.
     * @type {string}
     * @memberof CreateAccessTokenParams
     */
    'referenceId': string;
    /**
     * Lifetime of token
     * @type {number}
     * @memberof CreateAccessTokenParams
     */
    'tokenTtlInSeconds': number;
    /**
     * The payload of the access token.
     * @type {object}
     * @memberof CreateAccessTokenParams
     */
    'payload': object;
}

export const CreateAccessTokenParamsReferenceType = {
    USERS: 'users',
    SCHOOLS: 'schools',
    COURSES: 'courses',
    COURSEGROUPS: 'coursegroups',
    TASKS: 'tasks',
    LESSONS: 'lessons',
    TEAMS: 'teams',
    SUBMISSIONS: 'submissions',
    SCHOOL_EXTERNAL_TOOLS: 'school-external-tools',
    BOARDNODES: 'boardnodes',
    CONTEXT_EXTERNAL_TOOLS: 'context-external-tools',
    EXTERNAL_TOOLS: 'external-tools',
    INSTANCES: 'instances'
} as const;

export type CreateAccessTokenParamsReferenceType = typeof CreateAccessTokenParamsReferenceType[keyof typeof CreateAccessTokenParamsReferenceType];


