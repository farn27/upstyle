/**
 * OpenAPI/Swagger Documentation Generator
 * Generates API documentation for SvelteKit endpoints
 */

const openApiSpec = {
	openapi: '3.0.0',
	info: {
		title: 'Upstyle API',
		version: '1.0.0',
		description: 'API untuk sistem manajemen bisnis Upstyle - mencakup keuangan, CRM, HR, POS, dan E-commerce',
		contact: {
			name: 'Upstyle Support',
			email: 'support@upstyle.id'
		}
	},
	servers: [
		{
			url: 'http://localhost:5173',
			description: 'Development server'
		},
		{
			url: 'https://api.upstyle.id',
			description: 'Production server'
		}
	],
	components: {
		securitySchemes: {
			bearerAuth: {
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'JWT',
				description: 'JWT token dari login session'
			},
			csrfToken: {
				type: 'apiKey',
				in: 'header',
				name: 'x-csrf-token',
				description: 'CSRF token untuk form submissions'
			}
		},
		schemas: {
			SuccessResponse: {
				type: 'object',
				properties: {
					success: {
						type: 'boolean',
						example: true
					},
					message: {
						type: 'string',
						example: 'Operasi berhasil'
					},
					data: {
						type: 'object',
						description: 'Response data (struktur tergantung endpoint)'
					}
				}
			},
			ErrorResponse: {
				type: 'object',
				properties: {
					success: {
						type: 'boolean',
						example: false
					},
					message: {
						type: 'string',
						example: 'Terjadi kesalahan'
					},
					code: {
						type: 'string',
						example: 'VALIDATION_ERROR',
						description: 'Error code machine-readable'
					},
					details: {
						type: 'object',
						description: 'Error details (untuk validation error)'
					}
				}
			},
			PaginatedResponse: {
				type: 'object',
				properties: {
					success: {
						type: 'boolean',
						example: true
					},
					data: {
						type: 'array',
						description: 'Array of items'
					},
					pagination: {
						type: 'object',
						properties: {
							page: {
								type: 'integer',
								example: 1
							},
							limit: {
								type: 'integer',
								example: 20
							},
							total: {
								type: 'integer',
								example: 100
							},
							totalPages: {
								type: 'integer',
								example: 5
							}
						}
					}
				}
			}
		}
	},
	paths: {
		'/api/auth/login': {
			post: {
				tags: ['Authentication'],
				summary: 'Login user',
				description: 'Autentikasi user dengan email dan password',
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								required: ['email', 'password'],
								properties: {
									email: {
										type: 'string',
										format: 'email',
										example: 'user@example.com'
									},
									password: {
										type: 'string',
										format: 'password',
										example: 'password123'
									}
								}
							}
						}
					}
				},
				responses: {
					'200': {
						description: 'Login berhasil',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/SuccessResponse'
								}
							}
						}
					},
					'401': {
						description: 'Kredensial tidak valid',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/ErrorResponse'
								}
							}
						}
					}
				}
			}
		},
		'/api/app/products': {
			get: {
				tags: ['Products'],
				summary: 'Get products list',
				description: 'Ambil daftar produk dengan pagination',
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: 'unitId',
						in: 'query',
						required: true,
						schema: {
							type: 'integer'
						},
						description: 'ID unit bisnis'
					},
					{
						name: 'page',
						in: 'query',
						schema: {
							type: 'integer',
							default: 1
						},
						description: 'Nomor halaman'
					},
					{
						name: 'limit',
						in: 'query',
						schema: {
							type: 'integer',
							default: 20
						},
						description: 'Item per halaman'
					}
				],
				responses: {
					'200': {
						description: 'Daftar produk',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/PaginatedResponse'
								}
							}
						}
					}
				}
			},
			post: {
				tags: ['Products'],
				summary: 'Create new product',
				description: 'Tambah produk baru',
				security: [{ bearerAuth: [] }],
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								required: ['nama', 'unitId'],
								properties: {
									nama: {
										type: 'string',
										example: 'Produk Contoh'
									},
									unitId: {
										type: 'integer',
										example: 1
									},
									hargaBeli: {
										type: 'number',
										example: 10000
									},
									hargaJual: {
										type: 'number',
										example: 15000
									},
									stok: {
										type: 'integer',
										example: 100
									},
									kategori: {
										type: 'string',
										example: 'ELEKTRONIK'
									}
								}
							}
						}
					}
				},
				responses: {
					'200': {
						description: 'Produk berhasil dibuat',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/SuccessResponse'
								}
							}
						}
					}
				}
			}
		},
		'/api/app/crm': {
			get: {
				tags: ['CRM'],
				summary: 'Get CRM deals',
				description: 'Ambil daftar deals CRM dengan pagination',
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: 'unitId',
						in: 'query',
						required: true,
						schema: { type: 'integer' }
					},
					{
						name: 'page',
						in: 'query',
						schema: { type: 'integer', default: 1 }
					},
					{
						name: 'limit',
						in: 'query',
						schema: { type: 'integer', default: 20 }
					}
				],
				responses: {
					'200': {
						description: 'Daftar deals CRM',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/PaginatedResponse'
								}
							}
						}
					}
				}
			}
		},
		'/api/app/hr': {
			get: {
				tags: ['HR'],
				summary: 'Get HR data',
				description: 'Ambil data karyawan, absensi, dan payroll',
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: 'unitId',
						in: 'query',
						required: true,
						schema: { type: 'integer' }
					}
				],
				responses: {
					'200': {
						description: 'Data HR',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										success: { type: 'boolean' },
										data: {
											type: 'object',
											properties: {
												employees: { type: 'array' },
												attendance: { type: 'array' },
												payroll: { type: 'array' }
											}
										}
									}
								}
							}
						}
					}
				}
			}
		},
		'/api/app/finance': {
			get: {
				tags: ['Finance'],
				summary: 'Get finance data',
				description: 'Ambil data keuangan unit',
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: 'unitId',
						in: 'query',
						required: true,
						schema: { type: 'integer' }
					}
				],
				responses: {
					'200': {
						description: 'Data keuangan',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/SuccessResponse'
								}
							}
						}
					}
				}
			}
		}
	},
	tags: [
		{
			name: 'Authentication',
			description: 'API untuk autentikasi user'
		},
		{
			name: 'Products',
			description: 'API manajemen produk'
		},
		{
			name: 'CRM',
			description: 'API Customer Relationship Management'
		},
		{
			name: 'HR',
			description: 'API Human Resources'
		},
		{
			name: 'Finance',
			description: 'API Keuangan'
		}
	]
};

export default openApiSpec;
