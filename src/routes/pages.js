"use strict";
// Page routes for HTML rendering
// This module serves HTML pages for the frontend
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = pageRoutes;
var index_js_1 = require("../db/index.js");
var schema_js_1 = require("../db/schema.js");
var drizzle_orm_1 = require("drizzle-orm");
var analytics_js_1 = require("./analytics.js");
// Dietary tag labels and icons
var DIETARY_TAG_LABELS = {
    'vegetarian': { label: 'Vegetarian', icon: '🥬' },
    'vegan': { label: 'Vegan', icon: '🌱' },
    'gluten_free': { label: 'Gluten-Free', icon: '🌾' },
    'halal': { label: 'Halal', icon: '✓' },
    'kosher': { label: 'Kosher', icon: '✡' },
    'dairy_free': { label: 'Dairy-Free', icon: '🥛' },
    'nut_free': { label: 'Nut-Free', icon: '🥜' },
};
function buildDietaryBadges(dietaryTags, maxDisplay) {
    if (maxDisplay === void 0) { maxDisplay = 3; }
    if (!dietaryTags || dietaryTags.length === 0)
        return '';
    var tags = Array.isArray(dietaryTags) ? dietaryTags : JSON.parse(dietaryTags || '[]');
    if (tags.length === 0)
        return '';
    var displayTags = tags.slice(0, maxDisplay);
    var badges = displayTags.map(function (tag) {
        var info = DIETARY_TAG_LABELS[tag];
        if (!info)
            return '';
        return "<span class=\"dietary-badge\">".concat(info.icon, " ").concat(info.label, "</span>");
    }).join('');
    var overflow = tags.length > maxDisplay
        ? "<span class=\"dietary-badge overflow\">+".concat(tags.length - maxDisplay, " more</span>")
        : '';
    return "<div class=\"dietary-badges\">".concat(badges).concat(overflow, "</div>");
}
var CUISINE_TYPES = ['French', 'Italian', 'Japanese', 'Mexican', 'Mediterranean', 'Latin American', 'French Fusion'];
function getChefPhoto(cuisineTypes) {
    var cuisinePhotos = {
        'French': 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop&crop=face',
        'Italian': 'https://images.unsplash.com/photo-1583394293214-28ez6f5b5b96?w=400&h=400&fit=crop&crop=face',
        'Japanese': 'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=400&h=400&fit=crop&crop=face',
        'Mexican': 'https://images.unsplash.com/photo-1601628828688-632f38a5a7f0?w=400&h=400&fit=crop&crop=face',
        'Mediterranean': 'https://images.unsplash.com/photo-1560252811-2b291c368f9c?w=400&h=400&fit=crop&crop=face',
        'Latin American': 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=400&h=400&fit=crop&crop=face',
        'French Fusion': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop&crop=face',
    };
    for (var _i = 0, cuisineTypes_1 = cuisineTypes; _i < cuisineTypes_1.length; _i++) {
        var cuisine = cuisineTypes_1[_i];
        if (cuisinePhotos[cuisine]) {
            return cuisinePhotos[cuisine];
        }
    }
    return 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop&crop=face';
}
function getChefAvgResponseTime(chefId) {
    var _a;
    var result = index_js_1.db.select({
        avgMs: (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["coalesce(avg(", " - ", "), NULL)"], ["coalesce(avg(", " - ", "), NULL)"])), schema_js_1.leads.firstChefActionAt, schema_js_1.leads.createdAt)
    })
        .from(schema_js_1.leads)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.leads.chefId, chefId), (0, drizzle_orm_1.isNotNull)(schema_js_1.leads.firstChefActionAt)))
        .get();
    return (_a = result === null || result === void 0 ? void 0 : result.avgMs) !== null && _a !== void 0 ? _a : null;
}
function buildResponseTimeBadge(avgResponseMs) {
    if (avgResponseMs === null) {
        return '<span class="trust-badge"><span class="icon">⚡</span><span>Quick responses</span></span>';
    }
    var avgMinutes = Math.round(avgResponseMs / 60000);
    if (avgMinutes < 60) {
        return "<span class=\"trust-badge highlight\"><span class=\"icon\">\u26A1</span><span>Typically responds in ".concat(avgMinutes, " min</span></span>");
    }
    else if (avgMinutes < 1440) {
        var hours = Math.round(avgMinutes / 60);
        return "<span class=\"trust-badge\"><span class=\"icon\">\u23F1</span><span>Responds within ".concat(hours, " hour").concat(hours > 1 ? 's' : '', "</span></span>");
    }
    else {
        var days = Math.round(avgMinutes / 1440);
        return "<span class=\"trust-badge\"><span class=\"icon\">\uD83D\uDCC5</span><span>Responds within ".concat(days, " day").concat(days > 1 ? 's' : '', "</span></span>");
    }
}
function pageRoutes(server) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            // Services catalog page
            server.get('/services', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var query, result, dietaryFilterTags, allServices, filteredServices, selectedDate, blockedDatesMap, leadCounts, leadCountMap, topServiceId, maxLeadCount, bookingCounts, bookingCountMap, servicesWithData;
                return __generator(this, function (_a) {
                    query = request.query;
                    result = index_js_1.db.select({
                        id: schema_js_1.services.id,
                        chefId: schema_js_1.services.chefId,
                        name: schema_js_1.services.name,
                        description: schema_js_1.services.description,
                        pricePerPerson: schema_js_1.services.pricePerPerson,
                        minGuests: schema_js_1.services.minGuests,
                        maxGuests: schema_js_1.services.maxGuests,
                        createdAt: schema_js_1.services.createdAt,
                        dietaryTags: schema_js_1.services.dietaryTags,
                        chefName: schema_js_1.users.name,
                        chefLocation: schema_js_1.chefProfiles.location,
                        chefCuisineTypes: schema_js_1.chefProfiles.cuisineTypes,
                        chefVerified: schema_js_1.chefProfiles.verified,
                        chefPricePerPerson: schema_js_1.chefProfiles.pricePerPerson,
                    })
                        .from(schema_js_1.services)
                        .innerJoin(schema_js_1.users, (0, drizzle_orm_1.eq)(schema_js_1.services.chefId, schema_js_1.users.id))
                        .leftJoin(schema_js_1.chefProfiles, (0, drizzle_orm_1.eq)(schema_js_1.services.chefId, schema_js_1.chefProfiles.userId))
                        .$dynamic();
                    // Filter by cuisine type
                    if (query.cuisine) {
                        result = result.where((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["", " LIKE ", ""], ["", " LIKE ", ""])), schema_js_1.chefProfiles.cuisineTypes, '%' + query.cuisine + '%'));
                    }
                    // Filter by price range
                    if (query.minPrice) {
                        result = result.where((0, drizzle_orm_1.gte)(schema_js_1.services.pricePerPerson, parseFloat(query.minPrice)));
                    }
                    if (query.maxPrice) {
                        result = result.where((0, drizzle_orm_1.lte)(schema_js_1.services.pricePerPerson, parseFloat(query.maxPrice)));
                    }
                    dietaryFilterTags = query.dietary_tags
                        ? query.dietary_tags.split(',').map(function (t) { return t.trim().toLowerCase(); }).filter(Boolean)
                        : [];
                    // Sort
                    if (query.sort === 'price_asc') {
                        result = result.orderBy(schema_js_1.services.pricePerPerson);
                    }
                    else if (query.sort === 'price_desc') {
                        result = result.orderBy((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["", " DESC"], ["", " DESC"])), schema_js_1.services.pricePerPerson));
                    }
                    else if (query.sort === 'newest') {
                        result = result.orderBy((0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["", " DESC"], ["", " DESC"])), schema_js_1.services.createdAt));
                    }
                    else {
                        result = result.orderBy(schema_js_1.services.id);
                    }
                    allServices = result.all();
                    filteredServices = allServices;
                    if (dietaryFilterTags.length > 0) {
                        filteredServices = allServices.filter(function (service) {
                            var serviceTags = JSON.parse(service.dietaryTags || '[]');
                            return dietaryFilterTags.some(function (filterTag) { return serviceTags.includes(filterTag); });
                        });
                    }
                    selectedDate = query.date;
                    blockedDatesMap = new Map();
                    if (selectedDate) {
                        // chefBlockedDates table not available - blocked dates map stays empty
                        // This feature gracefully degrades if table doesn't exist
                    }
                    leadCounts = index_js_1.db.select({
                        serviceId: schema_js_1.leads.serviceId,
                        count: (0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["count(", ")"], ["count(", ")"])), schema_js_1.leads.id)
                    })
                        .from(schema_js_1.leads)
                        .groupBy(schema_js_1.leads.serviceId)
                        .all();
                    leadCountMap = new Map(leadCounts.map(function (l) { return [l.serviceId, l.count]; }));
                    topServiceId = null;
                    maxLeadCount = 0;
                    leadCounts.forEach(function (l) {
                        if (l.count > maxLeadCount) {
                            maxLeadCount = l.count;
                            topServiceId = l.serviceId;
                        }
                    });
                    bookingCounts = index_js_1.db.select({
                        serviceId: schema_js_1.bookings.serviceId,
                        count: (0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["count(", ")"], ["count(", ")"])), schema_js_1.bookings.id)
                    })
                        .from(schema_js_1.bookings)
                        .where((0, drizzle_orm_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["", " IN ('completed', 'confirmed')"], ["", " IN ('completed', 'confirmed')"])), schema_js_1.bookings.status))
                        .groupBy(schema_js_1.bookings.serviceId)
                        .all();
                    bookingCountMap = new Map(bookingCounts.map(function (b) { return [b.serviceId, b.count]; }));
                    // Sort by popularity if requested
                    if (query.sort === 'popular') {
                        filteredServices.sort(function (a, b) { return (leadCountMap.get(b.id) || 0) - (leadCountMap.get(a.id) || 0); });
                    }
                    servicesWithData = filteredServices.map(function (s) {
                        var _a;
                        return (__assign(__assign({}, s), { chefCuisineTypes: JSON.parse(s.chefCuisineTypes || '[]'), dietaryTags: JSON.parse(s.dietaryTags || '[]'), leadCount: leadCountMap.get(s.id) || 0, bookingCount: bookingCountMap.get(s.id) || 0, isTopService: s.id === topServiceId && maxLeadCount > 0, isUnavailableOnDate: (selectedDate && ((_a = blockedDatesMap.get(s.chefId)) === null || _a === void 0 ? void 0 : _a.includes(selectedDate))) || false }));
                    });
                    reply.header('Content-Type', 'text/html; charset=utf-8');
                    return [2 /*return*/, buildServicesPage(servicesWithData, query, CUISINE_TYPES)];
                });
            }); });
            // Service detail page
            server.get('/services/:id', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, url, useSimplifiedLeadForm, useNewSidebarCta, ctaVariant, service, cuisineTypes, servicePhotos, serviceDietaryTags, serviceWithPhotos, photo, verifiedBadge, today, futureDate, futureDateStr, blockedDatesResult, blockedDates, ratingResult, reviewCount, avgRating, featuredReview, socialProof, avgResponseMs, responseTimeBadge, leadCountResult, leadCount;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    id = request.params.id;
                    url = new URL(request.url, 'http://localhost');
                    useSimplifiedLeadForm = url.searchParams.get('lead_form') === 'simplified';
                    useNewSidebarCta = url.searchParams.get('sidebar') === 'new_cta';
                    ctaVariant = url.searchParams.get('cta') === 'testB' ? 'testB' : 'control';
                    service = index_js_1.db.select({
                        id: schema_js_1.services.id,
                        chefId: schema_js_1.services.chefId,
                        name: schema_js_1.services.name,
                        description: schema_js_1.services.description,
                        pricePerPerson: schema_js_1.services.pricePerPerson,
                        minGuests: schema_js_1.services.minGuests,
                        maxGuests: schema_js_1.services.maxGuests,
                        photos: schema_js_1.services.photos,
                        dietaryTags: schema_js_1.services.dietaryTags,
                        createdAt: schema_js_1.services.createdAt,
                        chefName: schema_js_1.users.name,
                        chefLocation: schema_js_1.chefProfiles.location,
                        chefCuisineTypes: schema_js_1.chefProfiles.cuisineTypes,
                        chefVerified: schema_js_1.chefProfiles.verified,
                        chefBio: schema_js_1.chefProfiles.bio,
                    })
                        .from(schema_js_1.services)
                        .innerJoin(schema_js_1.users, (0, drizzle_orm_1.eq)(schema_js_1.services.chefId, schema_js_1.users.id))
                        .leftJoin(schema_js_1.chefProfiles, (0, drizzle_orm_1.eq)(schema_js_1.services.chefId, schema_js_1.chefProfiles.userId))
                        .where((0, drizzle_orm_1.eq)(schema_js_1.services.id, parseInt(id)))
                        .get();
                    if (!service) {
                        reply.header('Content-Type', 'text/html; charset=utf-8');
                        return [2 /*return*/, build404Page()];
                    }
                    cuisineTypes = JSON.parse(service.chefCuisineTypes || '[]');
                    servicePhotos = JSON.parse(service.photos || '[]');
                    serviceDietaryTags = JSON.parse(service.dietaryTags || '[]');
                    serviceWithPhotos = __assign(__assign({}, service), { photos: servicePhotos, dietaryTags: serviceDietaryTags });
                    (0, analytics_js_1.trackServicePageViewEvent)({
                        serviceId: service.id,
                        chefId: service.chefId,
                        pricePerPerson: service.pricePerPerson,
                        cuisineType: cuisineTypes[0] || '',
                    });
                    photo = getChefPhoto(cuisineTypes);
                    verifiedBadge = service.chefVerified
                        ? '<span class="verified-badge-tooltip">✓ Verified Chef<span class="tooltip-text">This chef has been verified by Maison des Chefs</span></span>'
                        : '';
                    today = new Date().toISOString().split('T')[0];
                    futureDate = new Date();
                    futureDate.setDate(futureDate.getDate() + 90);
                    futureDateStr = futureDate.toISOString().split('T')[0];
                    blockedDatesResult = index_js_1.db.select({ date: schema_js_1.bookings.eventDate })
                        .from(schema_js_1.bookings)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.bookings.chefId, service.chefId), (0, drizzle_orm_1.gte)(schema_js_1.bookings.eventDate, today), (0, drizzle_orm_1.lte)(schema_js_1.bookings.eventDate, futureDateStr)))
                        .all();
                    blockedDates = blockedDatesResult.filter(function (b) { return b.date; }).map(function (b) { return ({ date: b.date }); });
                    ratingResult = index_js_1.db.select({
                        reviewCount: (0, drizzle_orm_1.sql)(templateObject_8 || (templateObject_8 = __makeTemplateObject(["count(*)"], ["count(*)"]))),
                        avgRating: (0, drizzle_orm_1.sql)(templateObject_9 || (templateObject_9 = __makeTemplateObject(["coalesce(avg(", "), 0)"], ["coalesce(avg(", "), 0)"])), schema_js_1.bookings.totalPrice),
                    })
                        .from(schema_js_1.bookings)
                        .where((0, drizzle_orm_1.eq)(schema_js_1.bookings.serviceId, service.id))
                        .get();
                    reviewCount = (_a = ratingResult === null || ratingResult === void 0 ? void 0 : ratingResult.reviewCount) !== null && _a !== void 0 ? _a : 0;
                    avgRating = (_b = ratingResult === null || ratingResult === void 0 ? void 0 : ratingResult.avgRating) !== null && _b !== void 0 ? _b : 0;
                    featuredReview = null;
                    socialProof = {
                        reviewCount: reviewCount,
                        avgRating: reviewCount > 0 ? Math.round(avgRating * 10) / 10 : 0,
                        featuredReview: null,
                    };
                    avgResponseMs = getChefAvgResponseTime(service.chefId);
                    responseTimeBadge = buildResponseTimeBadge(avgResponseMs);
                    leadCountResult = index_js_1.db.select({ count: (0, drizzle_orm_1.sql)(templateObject_10 || (templateObject_10 = __makeTemplateObject(["count(", ")"], ["count(", ")"])), schema_js_1.leads.id) })
                        .from(schema_js_1.leads)
                        .where((0, drizzle_orm_1.eq)(schema_js_1.leads.serviceId, service.id))
                        .get();
                    leadCount = (_c = leadCountResult === null || leadCountResult === void 0 ? void 0 : leadCountResult.count) !== null && _c !== void 0 ? _c : 0;
                    reply.header('Content-Type', 'text/html; charset=utf-8');
                    return [2 /*return*/, buildServiceDetailPage(serviceWithPhotos, cuisineTypes, photo, verifiedBadge, blockedDates, useSimplifiedLeadForm, useNewSidebarCta, socialProof, ctaVariant, responseTimeBadge, leadCount)];
                });
            }); });
            return [2 /*return*/];
        });
    });
}
function build404Page() {
    return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Service Not Found | Maison des Chefs</title>\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8f9fa; }\n    .error-container { text-align: center; padding: 2rem; }\n    h1 { font-size: 4rem; color: #2c3e50; margin-bottom: 1rem; }\n    p { color: #666; margin-bottom: 2rem; }\n    a { background: #c9a227; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 4px; font-weight: 600; }\n  </style>\n</head>\n<body>\n  <div class=\"error-container\">\n    <h1>404</h1>\n    <p>The service you're looking for doesn't exist.</p>\n    <a href=\"/services\">Browse All Services</a>\n  </div>\n</body>\n</html>";
}
function buildServicesPage(services, filters, cuisineOptions) {
    var currentCuisine = filters.cuisine || '';
    var currentMinPrice = filters.minPrice || '';
    var currentMaxPrice = filters.maxPrice || '';
    var currentSort = filters.sort || 'newest';
    var currentDate = filters.date || '';
    var currentDietaryTags = filters.dietary_tags ? filters.dietary_tags.split(',').map(function (t) { return t.trim(); }) : [];
    var dietaryFilterHtml = Object.entries(DIETARY_TAG_LABELS).map(function (_a) {
        var value = _a[0], info = _a[1];
        var checked = currentDietaryTags.includes(value) ? 'checked' : '';
        return "<label class=\"dietary-filter-checkbox\"><input type=\"checkbox\" name=\"dietary_tags\" value=\"".concat(value, "\" ").concat(checked, "> ").concat(info.icon, " ").concat(info.label, "</label>");
    }).join('');
    var serviceCards = services.length > 0
        ? services.map(function (service) {
            var photo = getChefPhoto(service.chefCuisineTypes || []);
            var cuisineList = (service.chefCuisineTypes || []).slice(0, 3).join(', ');
            var verifiedBadge = service.chefVerified
                ? '<span class="verified-badge-tooltip">✓ Verified<span class="tooltip-text">This chef has been verified by Maison des Chefs</span></span>'
                : '';
            var leadCount = service.leadCount || 0;
            var inquiryBadge = leadCount > 0
                ? "<span class=\"inquiry-badge\">".concat(leadCount, " inquiry").concat(leadCount !== 1 ? 'ies' : 'y', "</span>")
                : '';
            var topServiceBanner = service.isTopService
                ? '<div class="top-service-banner">🏆 Most Popular</div>'
                : '';
            var bookingCount = service.bookingCount || 0;
            var bookingBadge = bookingCount > 0
                ? "<span class=\"booking-badge\">\u2713 ".concat(bookingCount, " booking").concat(bookingCount !== 1 ? 's' : '', "</span>")
                : '';
            var notAvailableBadge = service.isUnavailableOnDate
                ? '<span class="not-available-badge">Not available</span>'
                : '';
            var dietaryBadgesHtml = buildDietaryBadges(service.dietaryTags);
            return "\n        <div class=\"service-card-wrapper\" data-service-id=\"".concat(service.id, "\" data-chef-id=\"").concat(service.chefId, "\">\n        <a href=\"/services/").concat(service.id, "\" class=\"service-card\" style=\"position:relative;\">\n          ").concat(topServiceBanner, "\n          <div class=\"service-photo\" style=\"background-image: url('").concat(photo, "')\"></div>\n          <div class=\"service-info\">\n            <h3>").concat(service.name, "</h3>\n            <p class=\"service-chef\">by ").concat(service.chefName, " ").concat(verifiedBadge, " ").concat(inquiryBadge, " ").concat(bookingBadge, " ").concat(notAvailableBadge, "</p>\n            <p class=\"service-cuisine\">").concat(cuisineList, "</p>\n            <p class=\"service-location\">\uD83D\uDCCD ").concat(service.chefLocation, "</p>\n            <p class=\"service-description\">").concat(service.description, "</p>\n            ").concat(dietaryBadgesHtml, "\n            <div class=\"service-meta\">\n              ").concat(service.pricePerPerson && service.pricePerPerson > 0
                ? "<span class=\"service-price\">$".concat(service.pricePerPerson, "/person</span>")
                : "<span class=\"service-price no-price\">Price upon request</span>", "\n              <span class=\"service-guests\">").concat(service.minGuests, "-").concat(service.maxGuests, " guests</span>\n            </div>\n          </div>\n        </a>\n        <label class=\"compare-checkbox-label\">\n          <input type=\"checkbox\" class=\"compare-chef-checkbox\" data-service-id=\"").concat(service.id, "\" data-chef-id=\"").concat(service.chefId, "\" data-service-name=\"").concat(service.name, "\" data-chef-name=\"").concat(service.chefName, "\" onchange=\"toggleCompareChef(this)\">\n          <span class=\"compare-checkbox-custom\"></span>\n          <span class=\"compare-checkbox-text\">Compare</span>\n        </label>\n        </div>");
        }).join('')
        : "<div class=\"no-results\">\n        <p>No services found matching your criteria.</p>\n        ".concat(currentDietaryTags.length > 0 ? '<p class="no-results-hint">Try removing dietary filters or adjusting your search.</p>' : '', "\n        <a href=\"/services\" class=\"reset-link\">Clear filters</a>\n      </div>");
    var cuisineOptionsHtml = cuisineOptions.map(function (c) { return "<option value=\"".concat(c, "\" ").concat(currentCuisine === c ? 'selected' : '', ">").concat(c, "</option>"); }).join('');
    var sortOptions = [
        { value: 'newest', label: 'Newest' },
        { value: 'popular', label: 'Most Popular' },
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
    ].map(function (o) { return "<option value=\"".concat(o.value, "\" ").concat(currentSort === o.value ? 'selected' : '', ">").concat(o.label, "</option>"); }).join('');
    var pageTitle = currentCuisine
        ? "".concat(currentCuisine, " Private Chefs in Montreal | Maison des Chefs")
        : 'Private Chefs in Montreal | Browse Services | Maison des Chefs';
    return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>".concat(pageTitle, "</title>\n  <meta name=\"description\" content=\"Browse and book private chefs for intimate dinners, parties, and special events in Montreal.\">\n  <style>\n    * { margin: 0; padding: 0; box-sizing: border-box; }\n    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }\n    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }\n    nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }\n    nav .nav-links { display: flex; gap: 1.5rem; }\n    nav .nav-links a { color: white; text-decoration: none; transition: opacity 0.3s; }\n    nav .nav-links a:hover { opacity: 0.8; }\n    .page-header { background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%); padding: 7rem 2rem 3rem; text-align: center; color: white; }\n    .page-header h1 { font-size: clamp(2rem, 4vw, 2.8rem); margin-bottom: 0.5rem; }\n    .page-header p { font-size: 1.1rem; opacity: 0.9; max-width: 600px; margin: 0 auto; }\n    .filter-section { background: white; padding: 1.5rem 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); position: sticky; top: 60px; z-index: 50; }\n    .quick-filters { max-width: 1200px; margin: 0 auto 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }\n    .quick-filter-label { font-size: 0.85rem; color: #888; font-weight: 500; margin-right: 0.5rem; }\n    .quick-filter-pill { padding: 0.35rem 0.85rem; background: #f0f0f0; color: #555; border-radius: 20px; font-size: 0.85rem; font-weight: 500; text-decoration: none; transition: all 0.2s; border: 1px solid transparent; }\n    .quick-filter-pill:hover { background: #e8e8e8; color: #333; }\n    .quick-filter-pill.active { background: #c9a227; color: white; }\n    .filter-container { max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }\n    .filter-group { display: flex; align-items: center; gap: 0.5rem; }\n    .filter-group label { font-weight: 500; color: #555; font-size: 0.9rem; }\n    .filter-group select, .filter-group input { padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.95rem; }\n    .filter-group input[type=\"number\"] { width: 90px; }\n    .price-range { display: flex; align-items: center; gap: 0.5rem; }\n    .price-range span { color: #888; }\n    .reset-filters { margin-left: auto; color: #c9a227; text-decoration: none; font-weight: 500; font-size: 0.9rem; }\n    .reset-filters:hover { text-decoration: underline; }\n    .dietary-filter-group { flex-direction: column; align-items: flex-start; gap: 0.5rem; }\n    .dietary-filter-options { display: flex; flex-wrap: wrap; gap: 0.5rem; }\n    .dietary-filter-checkbox { display: flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.6rem; background: #f5f5f5; border-radius: 16px; font-size: 0.85rem; cursor: pointer; transition: background 0.2s; }\n    .dietary-filter-checkbox:hover { background: #e8e8e8; }\n    .dietary-filter-checkbox input { margin: 0; }\n    .dietary-filter-checkbox:has(input:checked) { background: #c9a227; color: white; }\n    .desktop-only { display: flex; }\n    .mobile-only { display: none; }\n    .dietary-filter-collapsible { display: none; }\n    @media (min-width: 769px) {\n      .desktop-only { display: flex; }\n      .mobile-only { display: none; }\n    }\n    @media (max-width: 768px) {\n      .desktop-only { display: none !important; }\n      .mobile-only { display: block; }\n    }\n    .services-container { max-width: 1200px; margin: 2rem auto; padding: 0 2rem; }\n    .results-count { color: #666; margin-bottom: 1.5rem; font-size: 0.95rem; }\n    .services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 2rem; }\n    .service-card-wrapper { position: relative; display: flex; flex-direction: column; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.1); transition: transform 0.3s, box-shadow 0.3s; }\n    .service-card-wrapper:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }\n    .service-card { position: relative; display: flex; flex-direction: column; flex: 1; text-decoration: none; color: inherit; -webkit-tap-highlight-color: transparent; }\n    .top-service-banner { position: absolute; top: 12px; left: 12px; background: linear-gradient(135deg, #c9a227, #a88620); color: white; padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }\n    .service-photo { width: 100%; height: 180px; background-size: cover; background-position: center; }\n    .service-info { padding: 1.5rem; flex: 1; display: flex; flex-direction: column; }\n    .service-info h3 { font-size: 1.2rem; color: #2c3e50; margin-bottom: 0.25rem; }\n    .service-chef { color: #666; font-size: 0.9rem; margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.4rem; }\n    .verified-badge { font-size: 0.7rem; background: #27ae60; color: white; padding: 0.1rem 0.4rem; border-radius: 10px; font-weight: 600; }\n    .inquiry-badge, .booking-badge, .not-available-badge { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 12px; font-weight: 600; margin-left: 0.4rem; }\n    .inquiry-badge { background: #e8f5e9; color: #2e7d32; }\n    .booking-badge { background: #e3f2fd; color: #1565c0; }\n    .not-available-badge { background: #ffebee; color: #c62828; }\n    .service-cuisine { color: #c9a227; font-weight: 500; font-size: 0.9rem; margin-bottom: 0.3rem; }\n    .service-location { color: #888; font-size: 0.85rem; margin-bottom: 0.75rem; }\n    .service-description { color: #555; font-size: 0.9rem; margin-bottom: 0.5rem; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }\n    .dietary-badges { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.75rem; }\n    .dietary-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; background: #f0f8e8; color: #2d5a0b; border-radius: 12px; font-size: 0.75rem; font-weight: 500; }\n    .dietary-badge.overflow { background: #f5f5f5; color: #666; }\n    .service-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-top: 0.75rem; border-top: 1px solid #eee; }\n    .service-price { font-size: 1.15rem; font-weight: 700; color: #2c3e50; }\n    .service-price.no-price { color: #888; font-size: 0.95rem; font-weight: 500; }\n    .service-guests { color: #888; font-size: 0.85rem; }\n    .compare-checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.5rem 1.5rem; font-size: 0.85rem; color: #555; }\n    .compare-chef-checkbox { display: none; }\n    .compare-checkbox-custom { width: 20px; height: 20px; border: 2px solid #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background: white; }\n    .compare-chef-checkbox:checked + .compare-checkbox-custom { background: #c9a227; border-color: #c9a227; }\n    .compare-chef-checkbox:checked + .compare-checkbox-custom::after { content: '\u2713'; color: white; font-size: 0.75rem; font-weight: bold; }\n    .no-results { text-align: center; padding: 4rem 2rem; background: white; border-radius: 12px; }\n    .no-results p { color: #666; font-size: 1.1rem; margin-bottom: 1rem; }\n    .reset-link { color: #c9a227; font-weight: 500; }\n    footer { background: #1a1a1a; color: white; padding: 3rem 2rem; text-align: center; margin-top: 4rem; }\n    footer .logo { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }\n    footer p { color: rgba(255,255,255,0.7); margin-bottom: 0.5rem; }\n    footer a { color: rgba(255,255,255,0.7); text-decoration: none; }\n    @media (max-width: 768px) {\n      .services-grid { grid-template-columns: 1fr; }\n      .filter-container { flex-direction: column; align-items: stretch; }\n      .filter-group { width: 100%; }\n      .dietary-filter-options { gap: 0.3rem; }\n      .dietary-filter-group { display: none; }\n      .dietary-filter-collapsible { display: block; }\n      .dietary-filter-collapsible.collapsed .dietary-filter-content { display: none; }\n      .dietary-filter-collapsible .dietary-filter-header { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: #f5f5f5; border-radius: 8px; cursor: pointer; font-weight: 500; color: #555; }\n      .dietary-filter-collapsible .dietary-filter-header::after { content: '\u25BC'; font-size: 0.75rem; transition: transform 0.2s; }\n      .dietary-filter-collapsible.collapsed .dietary-filter-header::after { transform: rotate(-90deg); }\n      .dietary-filter-collapsible .dietary-filter-content { padding-top: 0.75rem; }\n      .no-results-hint { color: #888; font-size: 0.95rem; margin-top: 0.5rem; }\n    }\n  </style>\n</head>\n<body>\n  <nav>\n    <a href=\"/\" class=\"logo\">Maison des Chefs</a>\n    <div class=\"nav-links\">\n      <a href=\"/services\">Services</a>\n      <a href=\"/chefs\">Chefs</a>\n      <a href=\"/auth/login\">Sign In</a>\n    </div>\n  </nav>\n  \n  <section class=\"page-header\">\n    <h1>Discover Our Services</h1>\n    <p>From intimate dinners to grand celebrations, find the perfect private chef experience</p>\n  </section>\n  \n  <section class=\"filter-section\">\n    <div class=\"quick-filters\">\n      <span class=\"quick-filter-label\">Quick filters:</span>\n      <a href=\"/services?maxPrice=100\" class=\"quick-filter-pill ").concat(filters.maxPrice === '100' && !filters.minPrice ? 'active' : '', "\">Under $100</a>\n      <a href=\"/services?minPrice=100&maxPrice=150\" class=\"quick-filter-pill ").concat(filters.minPrice === '100' && filters.maxPrice === '150' ? 'active' : '', "\">$100-$150</a>\n      <a href=\"/services?minPrice=150&maxPrice=200\" class=\"quick-filter-pill ").concat(filters.minPrice === '150' && filters.maxPrice === '200' ? 'active' : '', "\">$150-$200</a>\n      <a href=\"/services?minPrice=200\" class=\"quick-filter-pill ").concat(filters.minPrice === '200' && !filters.maxPrice ? 'active' : '', "\">$200+</a>\n    </div>\n    <form class=\"filter-container\" method=\"get\" action=\"/services\">\n      <div class=\"filter-group\">\n        <label for=\"cuisine\">Cuisine:</label>\n        <select id=\"cuisine\" name=\"cuisine\">\n          <option value=\"\">All Cuisines</option>\n          ").concat(cuisineOptionsHtml, "\n        </select>\n      </div>\n      <div class=\"filter-group price-range\">\n        <label>Price:</label>\n        <input type=\"number\" name=\"minPrice\" placeholder=\"Min\" value=\"").concat(currentMinPrice, "\" min=\"0\">\n        <span>to</span>\n        <input type=\"number\" name=\"maxPrice\" placeholder=\"Max\" value=\"").concat(currentMaxPrice, "\" min=\"0\">\n        <span>/person</span>\n      </div>\n      <div class=\"filter-group\">\n        <label for=\"sort\">Sort by:</label>\n        <select id=\"sort\" name=\"sort\">").concat(sortOptions, "</select>\n      </div>\n      <div class=\"filter-group\">\n        <label for=\"date\">Date:</label>\n        <input type=\"date\" id=\"date\" name=\"date\" value=\"").concat(currentDate, "\" min=\"").concat(new Date().toISOString().split('T')[0], "\">\n      </div>\n      <div class=\"filter-group dietary-filter-group desktop-only\">\n        <label>Dietary:</label>\n        <div class=\"dietary-filter-options\">").concat(dietaryFilterHtml, "</div>\n      </div>\n      <div class=\"dietary-filter-collapsible mobile-only collapsed\">\n        <div class=\"dietary-filter-header\" onclick=\"toggleDietaryFilter(this)\">Dietary Needs</div>\n        <div class=\"dietary-filter-content\">\n          <div class=\"dietary-filter-options\">").concat(dietaryFilterHtml, "</div>\n        </div>\n      </div>\n      <a href=\"/services\" class=\"reset-filters\">Clear filters</a>\n    </form>\n  </section>\n  \n  <section class=\"services-container\">\n    <p class=\"results-count\">").concat(services.length, " service").concat(services.length !== 1 ? 's' : '', " available</p>\n    <div class=\"services-grid\">").concat(serviceCards, "</div>\n  </section>\n  \n  <footer>\n    <div class=\"logo\">Maison des Chefs</div>\n    <p>Montreal's premier private chef marketplace.</p>\n    <p>&copy; 2024 Maison des Chefs. All rights reserved.</p>\n  </footer>\n\n  <script>\n    document.querySelectorAll('.filter-container select, .filter-container input').forEach(el => {\n      el.addEventListener('change', () => {\n        document.querySelector('.filter-container').closest('form').submit();\n      });\n    });\n    \n    function toggleDietaryFilter(header) {\n      const collapsible = header.closest('.dietary-filter-collapsible');\n      collapsible.classList.toggle('collapsed');\n    }\n    \n    // Sync mobile checkboxes with desktop checkboxes\n    function syncDietaryCheckboxes() {\n      document.querySelectorAll('.dietary-filter-collapsible input[type=\"checkbox\"]').forEach(cb => {\n        const checkboxes = document.querySelectorAll('.dietary-filter-group.desktop-only input[type=\"checkbox\"]');\n        const desktopCb = Array.from(checkboxes).find(cb2 => cb2.value === (cb as any).value);\n        if (desktopCb) cb.checked = desktopCb.checked;\n      });\n    }\n    syncDietaryCheckboxes();\n    \n    document.querySelectorAll('.dietary-filter-collapsible input[type=\"checkbox\"]').forEach(cb => {\n      cb.addEventListener('change', () => {\n        const checkboxes = document.querySelectorAll('.dietary-filter-group.desktop-only input[type=\"checkbox\"]');\n        const desktopCb = Array.from(checkboxes).find(cb2 => cb2.value === (cb as any).value);\n        if (desktopCb) desktopCb.checked = cb.checked;\n        document.querySelector('.filter-container').closest('form').submit();\n      });\n    });\n    \n    document.querySelectorAll('.dietary-filter-group.desktop-only input[type=\"checkbox\"]').forEach(cb => {\n      cb.addEventListener('change', () => {\n        const checkboxes = document.querySelectorAll('.dietary-filter-collapsible input[type=\"checkbox\"]');\n        const mobileCb = Array.from(checkboxes).find(cb2 => cb2.value === (cb as any).value);\n        if (mobileCb) mobileCb.checked = cb.checked;\n      });\n    });\n    \n    const MAX_COMPARE_CHEFS = 5;\n    let selectedChefs = [];\n    \n    function toggleCompareChef(checkbox) {\n      const serviceId = parseInt(checkbox.dataset.serviceId);\n      const chefId = parseInt(checkbox.dataset.chefId);\n      const chefName = checkbox.dataset.chefName;\n      const serviceName = checkbox.dataset.serviceName;\n      \n      if (checkbox.checked) {\n        if (selectedChefs.length >= MAX_COMPARE_CHEFS) {\n          checkbox.checked = false;\n          alert('You can compare up to ' + MAX_COMPARE_CHEFS + ' chefs at a time.');\n          return;\n        }\n        selectedChefs.push({ serviceId, chefId, chefName, serviceName });\n      } else {\n        selectedChefs = selectedChefs.filter(c => c.chefId !== chefId);\n      }\n      updateCompareBar();\n    }\n    \n    function updateCompareBar() {\n      const bar = document.getElementById('compareBar');\n      if (!bar) return;\n      const selectedContainer = document.getElementById('compareBarSelected');\n      const inquireBtn = document.getElementById('compareInquireBtn');\n      if (selectedContainer) {\n        selectedContainer.innerHTML = selectedChefs.map(c => \n          '<span class=\"compare-bar-chef-tag\">' + c.serviceName + ' <span class=\"remove-tag\" onclick=\"event.preventDefault(); removeChef(' + c.chefId + ')\">\u00D7</span></span>'\n        ).join('');\n      }\n      if (inquireBtn) {\n        inquireBtn.style.display = selectedChefs.length >= 2 ? 'inline-block' : 'none';\n      }\n      bar.classList.toggle('visible', selectedChefs.length > 0);\n    }\n    \n    function removeChef(chefId) {\n      const checkbox = document.querySelector('.compare-chef-checkbox[data-chef-id=\"' + chefId + '\"]');\n      if (checkbox) checkbox.checked = false;\n      selectedChefs = selectedChefs.filter(c => c.chefId !== chefId);\n      updateCompareBar();\n    }\n    \n    function openCompareModal() {\n      document.getElementById('compareModal').style.display = 'flex';\n    }\n    \n    function closeCompareModal() {\n      document.getElementById('compareModal').style.display = 'none';\n    }\n  </script>\n</body>\n</html>");
}
function buildServiceDetailPage(service, cuisineTypes, photo, verifiedBadge, blockedDates, useSimplifiedLeadForm, useNewSidebarCta, socialProof, ctaVariant, responseTimeBadge, leadCount) {
    var _a;
    var cuisineList = cuisineTypes.join(', ');
    var sp = socialProof !== null && socialProof !== void 0 ? socialProof : { reviewCount: 0, avgRating: 0, featuredReview: null };
    var hasEnoughReviews = sp.reviewCount >= 3;
    var showRating = hasEnoughReviews && sp.avgRating > 0;
    var showTestimonial = ((_a = sp.featuredReview) === null || _a === void 0 ? void 0 : _a.comment) != null;
    var leadFormCtaText = ctaVariant === 'testB' ? 'Request Booking' : ctaVariant === 'testA' ? 'Request Your Date' : ctaVariant === 'testC' ? 'Check Availability' : 'Send Inquiry';
    // Urgency and social proof for booking card
    var leadCountNum = typeof leadCount === 'number' ? leadCount : 0;
    var urgencyLine = leadCountNum > 0
        ? "<div style=\"background: #fff3cd; color: #856404; padding: 0.6rem 0.75rem; border-radius: 6px; margin-bottom: 0.75rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;\"><span>\uD83D\uDCC5</span><span>Typically books out 2\u20133 weeks in advance</span></div>"
        : "<div style=\"background: #d4edda; color: #155724; padding: 0.6rem 0.75rem; border-radius: 6px; margin-bottom: 0.75rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;\"><span>\uD83D\uDCC5</span><span>Availability varies \u2014 submit a request to check</span></div>";
    var demandBadge = leadCountNum > 3
        ? "<div style=\"background: #e8f4f8; color: #0c5460; padding: 0.5rem 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;\"><span>\uD83D\uDD25</span><span>".concat(leadCountNum, " diners are interested in this service</span></div>")
        : leadCountNum > 0
            ? "<div style=\"background: #e8f4f8; color: #0c5460; padding: 0.5rem 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;\"><span>\uD83D\uDD25</span><span>".concat(leadCountNum, " diner").concat(leadCountNum === 1 ? ' has' : 's have', " inquired about this service</span></div>")
            : '';
    var testimonialText = '';
    var testimonialAuthor = '';
    var testimonialRating = 0;
    if (showTestimonial && sp.featuredReview) {
        var fullComment = sp.featuredReview.comment;
        testimonialText = fullComment.length > 150 ? fullComment.substring(0, 150) + '...' : fullComment;
        testimonialAuthor = sp.featuredReview.dinerFirstName || 'Guest';
        testimonialRating = sp.featuredReview.rating;
    }
    var availabilityInfo = '';
    if (blockedDates.length > 0) {
        availabilityInfo = "<div class=\"availability-warning\"><span class=\"warning-icon\">\u26A0\uFE0F</span><span>This chef has blocked some upcoming dates.</span></div>";
    }
    else {
        availabilityInfo = "<div class=\"availability-info\"><span class=\"info-icon\">\uD83D\uDCC5</span><span>Availability varies. Submit a booking request and the chef will confirm.</span></div>";
    }
    var blockedDatesJson = JSON.stringify(blockedDates.map(function (b) { return b.date; }));
    var dietaryBadgesHtml = service.dietaryTags && service.dietaryTags.length > 0
        ? service.dietaryTags.map(function (tag) {
            var info = DIETARY_TAG_LABELS[tag];
            return info ? "<span class=\"dietary-badge-detail\">".concat(info.icon, " ").concat(info.label, "</span>") : '';
        }).join('')
        : '';
    return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>".concat(service.name, " by ").concat(service.chefName, " | Maison des Chefs</title>\n  <meta name=\"description\" content=\"").concat(service.name, " in ").concat(service.chefLocation, ". ").concat(service.description.substring(0, 120), "...\">\n  <style>\n    * { margin: 0; padding: 0; box-sizing: border-box; }\n    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }\n    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }\n    nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }\n    nav .nav-links { display: flex; gap: 1.5rem; }\n    nav .nav-links a { color: white; text-decoration: none; }\n    .hero { height: 50vh; background-size: cover; background-position: center; position: relative; display: flex; align-items: flex-end; }\n    .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); }\n    .hero-content { position: relative; z-index: 1; padding: 2rem; color: white; }\n    .hero-content h1 { font-size: clamp(2rem, 5vw, 3rem); margin-bottom: 0.5rem; }\n    .hero-chef { font-size: 1.1rem; opacity: 0.9; }\n    .hero-price-badge { position: absolute; top: 1rem; right: 1rem; background: rgba(0,0,0,0.75); backdrop-filter: blur(10px); color: white; padding: 0.6rem 1rem; border-radius: 8px; font-size: 1rem; font-weight: 700; }\n    .content { max-width: 1200px; margin: 0 auto; padding: 2rem; display: grid; grid-template-columns: 1fr 380px; gap: 2rem; }\n    .main-info { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }\n    .availability-warning, .availability-info { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; }\n    .availability-warning { background: #fff3cd; color: #856404; }\n    .availability-info { background: #d4edda; color: #155724; }\n    h2 { font-size: 1.3rem; color: #2c3e50; margin-bottom: 1rem; margin-top: 1.5rem; }\n    h2:first-of-type { margin-top: 0; }\n    .description { color: #555; margin-bottom: 2rem; font-size: 1.05rem; }\n    .details-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem; }\n    .detail-item { background: white; padding: 1.25rem; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }\n    .detail-label { color: #888; font-size: 0.85rem; margin-bottom: 0.3rem; }\n    .detail-value { font-size: 1.1rem; font-weight: 600; color: #2c3e50; }\n    .dietary-options-detail { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 2rem; }\n    .dietary-badge-detail { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; background: #f0f8e8; color: #2d5a0b; border-radius: 20px; font-size: 0.95rem; font-weight: 500; }\n    .booking-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); height: fit-content; position: sticky; top: 80px; }\n    .booking-card .price { font-size: 2rem; font-weight: 700; color: #2c3e50; margin-bottom: 0.5rem; }\n    .booking-card .per-person { color: #888; font-size: 0.95rem; margin-bottom: 1.5rem; }\n    footer { background: #1a1a1a; color: white; padding: 3rem 2rem; text-align: center; margin-top: 4rem; }\n    footer .logo { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }\n    footer p { color: rgba(255,255,255,0.7); }\n    @media (max-width: 768px) {\n      .content { grid-template-columns: 1fr; }\n      .booking-card { position: static; }\n    }\n  </style>\n</head>\n<body>\n  <nav>\n    <a href=\"/\" class=\"logo\">Maison des Chefs</a>\n    <div class=\"nav-links\">\n      <a href=\"/services\">Services</a>\n      <a href=\"/chefs\">Chefs</a>\n      <a href=\"/auth/login\">Sign In</a>\n    </div>\n  </nav>\n  \n  <section class=\"hero\" style=\"background-image: url('").concat(photo, "')\">\n    <div class=\"hero-overlay\"></div>\n    ").concat(service.pricePerPerson && service.pricePerPerson > 0
        ? "<div class=\"hero-price-badge\">$".concat(service.pricePerPerson, "<span>/person</span></div>")
        : "<div class=\"hero-price-badge no-price\">Price upon request</div>", "\n    <div class=\"hero-content\">\n      <h1>").concat(service.name, "</h1>\n      <div class=\"hero-chef\">by ").concat(service.chefName, " ").concat(verifiedBadge, "</div>\n    </div>\n  </section>\n  \n  <section class=\"content\">\n    <div class=\"main-info\">\n      ").concat(availabilityInfo, "\n      \n      <h2>About This Service</h2>\n      <p class=\"description\">").concat(service.description, "</p>\n      \n      <h2>Service Details</h2>\n      <div class=\"details-grid\">\n        <div class=\"detail-item\">\n          <div class=\"detail-label\">Cuisine</div>\n          <div class=\"detail-value\">").concat(cuisineList, "</div>\n        </div>\n        <div class=\"detail-item\">\n          <div class=\"detail-label\">Location</div>\n          <div class=\"detail-value\">").concat(service.chefLocation, "</div>\n        </div>\n        <div class=\"detail-item\">\n          <div class=\"detail-label\">Min Guests</div>\n          <div class=\"detail-value\">").concat(service.minGuests, "</div>\n        </div>\n        <div class=\"detail-item\">\n          <div class=\"detail-label\">Max Guests</div>\n          <div class=\"detail-value\">").concat(service.maxGuests, "</div>\n        </div>\n      </div>\n      \n      ").concat(dietaryBadgesHtml ? "\n      <h2>Dietary Options</h2>\n      <div class=\"dietary-options-detail\">".concat(dietaryBadgesHtml, "</div>\n      ") : '', "\n      \n      <h2>About the Chef</h2>\n      <p class=\"description\">").concat(service.chefBio || 'A talented private chef ready to create an unforgettable dining experience for you.', "</p>\n    </div>\n    \n    <div class=\"booking-card\">\n      <div class=\"price\">").concat(service.pricePerPerson && service.pricePerPerson > 0 ? '$' + service.pricePerPerson : 'Price', "</div>\n      <div class=\"per-person\">").concat(service.pricePerPerson && service.pricePerPerson > 0 ? 'per person' : 'upon request', "</div>\n      <p style=\"color: #666; margin-bottom: 1rem;\">").concat(service.minGuests, "-").concat(service.maxGuests, " guests</p>\n      ").concat(urgencyLine, "\n      ").concat(demandBadge, "\n      <a href=\"/book/").concat(service.id, "\" class=\"book-btn\" style=\"display: block; background: #c9a227; color: white; text-align: center; padding: 1rem; border-radius: 4px; text-decoration: none; font-weight: 600;\">").concat(ctaVariant === 'testA' ? 'Request Your Date' : ctaVariant === 'testB' ? 'Request Booking' : ctaVariant === 'testC' ? 'Check Availability' : 'Book This Service', "</a>\n    </div>\n  </section>\n  \n  <footer>\n    <div class=\"logo\">Maison des Chefs</div>\n    <p>Montreal's premier private chef marketplace.</p>\n    <p>&copy; 2024 Maison des Chefs. All rights reserved.</p>\n  </footer>\n</body>\n</html>");
}
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10;
