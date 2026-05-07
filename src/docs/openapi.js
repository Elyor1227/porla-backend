/**
 * OpenAPI (Swagger) spec for Porla Backend.
 *
 * Maqsad: API'larni tushunarli ko'rinishda /api/docs da ko'rsatish.
 */

const { PORT } = require("../config/constants");

function buildServerUrl() {
  const fromEnv = process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || "";
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return `http://localhost:${PORT}`;
}

module.exports = function buildOpenApiSpec() {
  const server = buildServerUrl();

  return {
    openapi: "3.0.3",
    info: {
      title: "Porla Backend API",
      version: "2.0.0",
      description:
        "Porla — Women's Health Education Platform Backend. Auth (JWT), Courses/Lessons, Video streaming, Tracker, Notifications, Q&A, Daily Tips, Admin.",
    },
    servers: [{ url: `${server}/api` }],
    tags: [
      { name: "Auth" },
      { name: "Courses" },
      { name: "Video" },
      { name: "Tracker" },
      { name: "Notifications" },
      { name: "Q&A" },
      { name: "Daily Tips" },
      { name: "Admin" },
      { name: "Health" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Success: {
          type: "object",
          properties: { success: { type: "boolean", example: true } },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
          },
        },
        AuthRegisterBody: {
          type: "object",
          required: ["name", "email", "password", "phone"],
          properties: {
            name: { type: "string", example: "User" },
            email: { type: "string", example: "user@example.com" },
            password: { type: "string", example: "123456" },
            phone: { type: "string", example: "+998901234567" },
          },
        },
        AuthLoginBody: {
          type: "object",
          required: ["password"],
          properties: {
            email: { type: "string", example: "user@example.com" },
            phone: { type: "string", example: "+998901234567" },
            login: {
              type: "string",
              example: "user@example.com",
              description: "Universal maydon: email yoki phone yuborish mumkin",
            },
            password: { type: "string", example: "123456" },
          },
        },
        UserPublic: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string", example: "+998901234567" },
            avatar: { type: "string" },
            isPro: { type: "boolean" },
            proExpiresAt: { type: "string", nullable: true },
            isAdmin: { type: "boolean" },
            isBlocked: { type: "boolean" },
          },
        },
        AuthTokenResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            token: { type: "string" },
            user: { $ref: "#/components/schemas/UserPublic" },
            phoneSetupRequired: { type: "boolean", example: false },
          },
        },
        Course: {
          type: "object",
          properties: {
            _id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            icon: { type: "string" },
            color: { type: "string" },
            bgColor: { type: "string" },
            isPro: { type: "boolean" },
            order: { type: "number" },
            isActive: { type: "boolean" },
            lessonCount: { type: "number" },
            isLocked: { type: "boolean" },
          },
        },
        Lesson: {
          type: "object",
          properties: {
            _id: { type: "string" },
            courseId: { type: "string" },
            title: { type: "string" },
            content: { type: "string" },
            videoUrl: { type: "string", description: "External URL yoki /api/courses/.../video" },
            duration: { type: "number" },
            order: { type: "number" },
            isPro: { type: "boolean" },
            isActive: { type: "boolean" },
            isCompleted: { type: "boolean" },
            isLocked: { type: "boolean" },
          },
        },
      },
    },
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          responses: {
            200: {
              description: "Service status",
            },
          },
        },
      },

      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthRegisterBody" },
              },
            },
          },
          responses: {
            201: { description: "Registered", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthTokenResponse" } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            409: { description: "Email exists", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthLoginBody" } } },
          },
          responses: {
            200: { description: "Logged in", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthTokenResponse" } } } },
            401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Current user (me)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Me" }, 401: { description: "Unauthorized" } },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
        },
      },
      "/auth/update-profile": {
        patch: {
          tags: ["Auth"],
          summary: "Update profile (name/avatar)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { name: { type: "string" }, avatar: { type: "string" } },
                },
              },
            },
          },
          responses: { 200: { description: "Updated" }, 401: { description: "Unauthorized" } },
        },
      },
      "/auth/change-password": {
        patch: {
          tags: ["Auth"],
          summary: "Change password",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["currentPassword", "newPassword"],
                  properties: {
                    currentPassword: { type: "string" },
                    newPassword: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Changed" }, 400: { description: "Bad request" }, 401: { description: "Unauthorized" } },
        },
      },
      "/auth/update-phone": {
        patch: {
          tags: ["Auth"],
          summary: "Update phone number",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["phone"],
                  properties: {
                    phone: { type: "string", example: "+998901234567" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Phone saved" },
            400: { description: "Invalid phone format" },
            409: { description: "Phone already exists" },
            401: { description: "Unauthorized" },
          },
        },
      },

      "/courses": {
        get: {
          tags: ["Courses"],
          summary: "List courses",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Courses list",
              content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { type: "object", properties: { courses: { type: "array", items: { $ref: "#/components/schemas/Course" } } } } } } } },
            },
          },
        },
      },
      "/courses/{id}": {
        get: {
          tags: ["Courses"],
          summary: "Get one course with lessons",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "Course + lessons" },
            403: { description: "Pro locked" },
            404: { description: "Not found" },
          },
        },
      },
      "/courses/{courseId}/lessons/{lessonId}": {
        get: {
          tags: ["Courses"],
          summary: "Get one lesson (with navigation)",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "courseId", in: "path", required: true, schema: { type: "string" } },
            { name: "lessonId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { 200: { description: "Lesson details" }, 403: { description: "Pro locked" }, 404: { description: "Not found" } },
        },
      },
      "/courses/{courseId}/lessons/{lessonId}/complete": {
        post: {
          tags: ["Courses"],
          summary: "Complete a lesson",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "courseId", in: "path", required: true, schema: { type: "string" } },
            { name: "lessonId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { 200: { description: "Completed" }, 403: { description: "Pro locked" }, 404: { description: "Not found" } },
        },
      },
      "/courses/{courseId}/lessons/{lessonId}/video": {
        get: {
          tags: ["Video"],
          summary: "Stream lesson video (Range supported)",
          description:
            "HTML <video> ko'pincha Authorization yubormaydi. Shuning uchun ?token=JWT query ham qo'llab-quvvatlanadi.",
          parameters: [
            { name: "courseId", in: "path", required: true, schema: { type: "string" } },
            { name: "lessonId", in: "path", required: true, schema: { type: "string" } },
            { name: "token", in: "query", required: false, schema: { type: "string" } },
            { name: "download", in: "query", required: false, schema: { type: "string", enum: ["0", "1", "true", "false"] } },
          ],
          responses: {
            200: { description: "Video stream" },
            206: { description: "Partial content (Range)" },
            401: { description: "Unauthorized" },
            403: { description: "Pro locked" },
            404: { description: "Video not found" },
          },
        },
      },

      "/tracker/today": {
        get: {
          tags: ["Tracker"],
          summary: "Today tracker data",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Today data" } },
        },
      },
      "/tracker/cycles": {
        get: {
          tags: ["Tracker"],
          summary: "List cycles",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Cycles" } },
        },
        post: {
          tags: ["Tracker"],
          summary: "Create cycle",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { type: "object", required: ["startDate"], properties: { startDate: { type: "string" }, cycleLength: { type: "number" }, notes: { type: "string" } } },
              },
            },
          },
          responses: { 201: { description: "Created" }, 400: { description: "Bad request" } },
        },
      },
      "/tracker/cycles/{id}": {
        patch: {
          tags: ["Tracker"],
          summary: "Update cycle",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
          responses: { 200: { description: "Updated" }, 404: { description: "Not found" } },
        },
      },
      "/tracker/symptoms": {
        post: {
          tags: ["Tracker"],
          summary: "Add/update symptoms",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { type: "object", required: ["date"], properties: { date: { type: "string" }, items: { type: "array", items: { type: "string" } }, mood: { type: "string" }, painLevel: { type: "number" }, notes: { type: "string" } } },
              },
            },
          },
          responses: { 200: { description: "Saved" }, 404: { description: "No cycle" } },
        },
      },

      "/notifications": {
        get: {
          tags: ["Notifications"],
          summary: "List notifications",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Notifications" } },
        },
      },
      "/notifications/{id}/read": {
        patch: {
          tags: ["Notifications"],
          summary: "Mark notification as read",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/notifications/read-all": {
        patch: {
          tags: ["Notifications"],
          summary: "Mark all as read",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },

      "/qna/questions": {
        post: {
          tags: ["Q&A"],
          summary: "Submit anonymous question (public)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["question"],
                  properties: {
                    question: { type: "string" },
                    topic: { type: "string" },
                    askedName: { type: "string" },
                    contact: { type: "string", description: "email/telefon (ixtiyoriy)" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Submitted" }, 400: { description: "Bad request" } },
        },
      },
      "/qna/answers": {
        get: {
          tags: ["Q&A"],
          summary: "Authenticated user answers",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Items" } },
        },
      },
      "/qna/anon/answers": {
        get: {
          tags: ["Q&A"],
          summary: "Anonymous check answers by contact",
          parameters: [{ name: "contact", in: "query", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Items" }, 400: { description: "Bad request" } },
        },
      },
      "/qna/admin/questions": {
        get: {
          tags: ["Q&A", "Admin"],
          summary: "Admin list questions",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "page", in: "query", schema: { type: "number" } },
            { name: "limit", in: "query", schema: { type: "number" } },
            { name: "status", in: "query", schema: { type: "string", enum: ["pending", "answered"] } },
            { name: "published", in: "query", schema: { type: "string", enum: ["true", "false"] } },
            { name: "search", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "Items" } },
        },
      },
      "/qna/admin/questions/{id}": {
        get: {
          tags: ["Q&A", "Admin"],
          summary: "Admin question by id",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Item" }, 404: { description: "Not found" } },
        },
        delete: {
          tags: ["Q&A", "Admin"],
          summary: "Admin delete question",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Deleted" }, 404: { description: "Not found" } },
        },
      },
      "/qna/admin/questions/{id}/answer": {
        patch: {
          tags: ["Q&A", "Admin"],
          summary: "Admin answer question",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["answer"], properties: { answer: { type: "string" }, isPublished: { type: "boolean" } } } } } },
          responses: { 200: { description: "Saved" }, 400: { description: "Bad request" }, 404: { description: "Not found" } },
        },
      },
      "/qna/admin/questions/{id}/publish": {
        patch: {
          tags: ["Q&A", "Admin"],
          summary: "Admin publish/unpublish question",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["isPublished"], properties: { isPublished: { type: "boolean" } } } } } },
          responses: { 200: { description: "OK" }, 404: { description: "Not found" } },
        },
      },

      "/tips/today": {
        get: {
          tags: ["Daily Tips"],
          summary: "Get today tip (public)",
          responses: { 200: { description: "Tip" } },
        },
      },
      "/tips": {
        get: {
          tags: ["Daily Tips"],
          summary: "List tips (public)",
          parameters: [
            { name: "page", in: "query", schema: { type: "number" } },
            { name: "limit", in: "query", schema: { type: "number" } },
            { name: "category", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "Tips list" } },
        },
      },
      "/tips/admin/tips": {
        get: {
          tags: ["Daily Tips", "Admin"],
          summary: "Admin list tips",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Tips" } },
        },
        post: {
          tags: ["Daily Tips", "Admin"],
          summary: "Admin create tip",
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["content"], properties: { content: { type: "string" }, category: { type: "string" }, emoji: { type: "string" }, publishDate: { type: "string" }, isActive: { type: "boolean" } } } } } },
          responses: { 201: { description: "Created" }, 400: { description: "Bad request" } },
        },
      },
      "/tips/admin/tips/{id}": {
        patch: {
          tags: ["Daily Tips", "Admin"],
          summary: "Admin update tip",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
          responses: { 200: { description: "Updated" }, 404: { description: "Not found" } },
        },
        delete: {
          tags: ["Daily Tips", "Admin"],
          summary: "Admin delete tip",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Deleted" }, 404: { description: "Not found" } },
        },
      },

      "/admin/create-admin": {
        post: {
          tags: ["Admin"],
          summary: "One-time create first admin (x-admin-key)",
          parameters: [{ name: "x-admin-key", in: "header", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "email", "password"], properties: { name: { type: "string" }, email: { type: "string" }, password: { type: "string" } } } } } },
          responses: { 201: { description: "Created" }, 403: { description: "Forbidden" }, 409: { description: "Already exists" } },
        },
      },
      "/admin/stats": {
        get: {
          tags: ["Admin"],
          summary: "Admin dashboard stats",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Stats" }, 403: { description: "Admin required" } },
        },
      },
      "/admin/users": {
        get: {
          tags: ["Admin"],
          summary: "Admin list users",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Users" } },
        },
      },
      "/admin/users/{id}": {
        get: {
          tags: ["Admin"],
          summary: "Admin user by id",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "User" }, 404: { description: "Not found" } },
        },
      },
      "/admin/users/{id}/pro": {
        patch: {
          tags: ["Admin"],
          summary: "Admin set pro",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { isPro: { type: "boolean" }, months: { type: "number" } } } } } },
          responses: { 200: { description: "OK" } },
        },
      },
      "/admin/users/{id}/block": {
        patch: {
          tags: ["Admin"],
          summary: "Admin block/unblock user",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { isBlocked: { type: "boolean" } } } } } },
          responses: { 200: { description: "OK" } },
        },
      },
      "/admin/users/{id}": {
        delete: {
          tags: ["Admin"],
          summary: "Admin delete user",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Deleted" }, 403: { description: "Cannot delete admin" }, 404: { description: "Not found" } },
        },
      },
      "/admin/broadcast": {
        post: {
          tags: ["Admin"],
          summary: "Admin broadcast notification",
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["title", "message"], properties: { title: { type: "string" }, message: { type: "string" }, type: { type: "string" }, onlyPro: { type: "boolean" } } } } } },
          responses: { 200: { description: "OK" } },
        },
      },
      "/admin/courses": {
        get: {
          tags: ["Admin"],
          summary: "Admin list courses",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Courses" } },
        },
        post: {
          tags: ["Admin"],
          summary: "Admin create course",
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["title", "description"], properties: { title: { type: "string" }, description: { type: "string" }, icon: { type: "string" }, color: { type: "string" }, bgColor: { type: "string" }, isPro: { type: "boolean" }, order: { type: "number" } } } } } },
          responses: { 201: { description: "Created" }, 400: { description: "Bad request" } },
        },
      },
      "/admin/courses/{id}": {
        patch: {
          tags: ["Admin"],
          summary: "Admin update course",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
          responses: { 200: { description: "Updated" }, 404: { description: "Not found" } },
        },
        delete: {
          tags: ["Admin"],
          summary: "Admin delete course",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Deleted" }, 404: { description: "Not found" } },
        },
      },
      "/admin/courses/{courseId}/lessons": {
        get: {
          tags: ["Admin"],
          summary: "Admin list lessons for a course",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Lessons" } },
        },
        post: {
          tags: ["Admin"],
          summary: "Admin create lesson (multipart for video)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["title", "content"],
                  properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                    duration: { type: "number" },
                    order: { type: "number" },
                    isPro: { type: "boolean" },
                    videoUrl: { type: "string", description: "External URL (ixtiyoriy). video fayl yuklansa ignored." },
                    video: { type: "string", format: "binary" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Created" }, 400: { description: "Bad request" } },
        },
      },
      "/admin/courses/{courseId}/lessons/{id}": {
        patch: {
          tags: ["Admin"],
          summary: "Admin update lesson (multipart optional video)",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "courseId", in: "path", required: true, schema: { type: "string" } },
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                    duration: { type: "number" },
                    order: { type: "number" },
                    isPro: { type: "boolean" },
                    videoUrl: { type: "string" },
                    video: { type: "string", format: "binary" },
                  },
                },
              },
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
          responses: { 200: { description: "Updated" }, 404: { description: "Not found" } },
        },
        delete: {
          tags: ["Admin"],
          summary: "Admin delete lesson",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "courseId", in: "path", required: true, schema: { type: "string" } },
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { 200: { description: "Deleted" }, 404: { description: "Not found" } },
        },
      },
      "/admin/seed": {
        post: {
          tags: ["Admin"],
          summary: "Admin seed data (one time)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Seeded" } },
        },
      },
    },
  };
};

