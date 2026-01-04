import Joi from "joi";

// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const createAdminSchema = Joi.object({
  first_name: Joi.string().max(50).required().messages({
    'string.base': 'First Name should be a type of text',
    'string.empty': 'First Name cannot be an empty field',
    'string.max': 'First Name should have a maximum length of {#limit}',
    'any.required': 'First Name is a required field'
  }),
  last_name: Joi.string().max(50).required().messages({
    'string.base': 'Last Name should be a type of text',
    'string.empty': 'Last Name cannot be an empty field',
    'string.max': 'Last Name should have a maximum length of {#limit}',
    'any.required': 'Last Name is a required field'
  }),
  email_address: Joi.string().email().max(50).required().messages({
    'string.base': 'Email Address should be a type of text',
    'string.empty': 'Email Address cannot be an empty field',
    'string.max': 'Email Address should have a maximum length of {#limit}',
    'any.required': 'Email Address is a required field'
  }),
  designation: Joi.string().max(50).optional().allow('', null),
  phone_number: Joi.number().integer().optional(),
  user_name: Joi.string().max(50).required().messages({
    'string.base': 'User Name should be a type of text',
    'string.empty': 'User Name cannot be an empty field',
    'string.max': 'User Name should have a maximum length of {#limit}',
    'any.required': 'User Name is a required field'
  }),
  password: Joi.string().required(),
  reconfirm_password: Joi.string().optional().allow('', null),
  status: Joi.boolean().required().messages({
    'boolean.base': 'Status should be a type of boolean',
    'boolean.empty': 'Status cannot be an empty field',
    'any.required': 'Status is a required field'
  }),
  created_by: Joi.number().integer().optional()
});
