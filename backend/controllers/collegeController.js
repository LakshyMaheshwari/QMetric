const College = require('../Model/College');
const User = require('../Model/user');
const { logAudit } = require('../utils/auditLog');

/**
 * GET /admin/colleges
 * Lists all colleges with pagination, search, status filter, and sort.
 * Accessible by Super Admin.
 */
// const getColleges = async (req, res) => {
//     try {
//         const { search = '', status = '', sortBy = 'createdAt', order = 'desc', page = 1, limit = 50 } = req.query;

//         const query = {};

//         if (search) {
//             query.$or = [
//                 { name: { $regex: search, $options: 'i' } },
//                 { code: { $regex: search, $options: 'i' } },
//                 { city: { $regex: search, $options: 'i' } },
//                 { state: { $regex: search, $options: 'i' } }
//             ];
//         }

//         if (status === 'active') query.isActive = true;
//         else if (status === 'inactive') query.isActive = false;

//         const pageNum = Math.max(1, parseInt(page, 10));
//         const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
//         const skip = (pageNum - 1) * limitNum;

//         const sortObj = { [sortBy]: order === 'asc' ? 1 : -1 };

//         const [colleges, total] = await Promise.all([
//             College.find(query)
//                 .populate('adminIds', 'userName email fullName')
//                 .sort(sortObj)
//                 .skip(skip)
//                 .limit(limitNum)
//                 .lean(),
//             College.countDocuments(query)
//         ]);

//         // Aggregate system-wide summary counts for super admin dashboard
//         const [totalCount, activeCount, totalTeachersCount, totalPapersCount] = await Promise.all([
//             College.countDocuments(),
//             College.countDocuments({ isActive: true }),
//             User.countDocuments({ role: 'teacher' }),
//             College.aggregate([
//                 { $group: { _id: null, total: { $sum: '$totalPapers' } } }
//             ])
//         ]);

//         return res.json({
//             error: false,
//             colleges,
//             total,
//             page: pageNum,
//             totalPages: Math.ceil(total / limitNum),
//             summary: {
//                 totalColleges: totalCount,
//                 activeColleges: activeCount,
//                 inactiveColleges: totalCount - activeCount,
//                 totalTeachers: totalTeachersCount,
//                 totalPapers: totalPapersCount[0]?.total || 0
//             }
//         });
//     } catch (err) {
//         console.error('Error fetching colleges:', err);
//         return res.status(500).json({ error: true, message: 'Server error fetching colleges', details: err.message });
//     }
// };

/**
 * POST /admin/colleges
 * Create a new college.
 * Body: { name, code, address, city, state, adminIds, isActive }
 */
// const createCollege = async (req, res) => {
//     try {
//         const { name, code, address, city, state, adminIds, isActive } = req.body;

//         if (!name || !name.trim()) {
//             return res.status(400).json({ error: true, message: 'College name is required.' });
//         }
//         if (!code || !code.trim()) {
//             return res.status(400).json({ error: true, message: 'College code is required.' });
//         }

//         const trimmedCode = code.trim().toUpperCase();
//         const trimmedName = name.trim();

//         // Check for duplicate name or code
//         const existing = await College.findOne({
//             $or: [
//                 { code: trimmedCode },
//                 { name: { $regex: `^${trimmedName}$`, $options: 'i' } }
//             ]
//         });

//         if (existing) {
//             const conflict = existing.code === trimmedCode ? 'College code' : 'College name';
//             return res.status(409).json({ error: true, message: `${conflict} is already registered.` });
//         }

//         const newCollege = new College({
//             name: trimmedName,
//             code: trimmedCode,
//             address: address ? address.trim() : '',
//             city: city ? city.trim() : '',
//             state: state ? state.trim() : '',
//             adminIds: Array.isArray(adminIds) ? adminIds : [],
//             isActive: typeof isActive === 'boolean' ? isActive : true,
//             totalPapers: 0,
//             totalTeachers: 0
//         });

//         await newCollege.save();

//         await logAudit({
//             userId: req.user.userId,
//             action: 'CREATE_COLLEGE',
//             resource: `College:${newCollege._id}`,
//             changes: {
//                 newValue: { name: newCollege.name, code: newCollege.code },
//             },
//             request: req,
//         });

//         return res.status(201).json({
//             error: false,
//             message: 'College created successfully.',
//             college: newCollege
//         });
//     } catch (err) {
//         console.error('Error creating college:', err);
//         return res.status(500).json({ error: true, message: 'Server error creating college', details: err.message });
//     }
// };

/**
 * PUT /admin/colleges/:id
 * Update an existing college.
 */
// const updateCollege = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { name, code, address, city, state, adminIds, isActive } = req.body;

//         const college = await College.findById(id);
//         if (!college) {
//             return res.status(404).json({ error: true, message: 'College not found.' });
//         }

//         if (name && name.trim()) {
//             const trimmedName = name.trim();
//             const nameConflict = await College.findOne({
//                 _id: { $ne: id },
//                 name: { $regex: `^${trimmedName}$`, $options: 'i' }
//             });
//             if (nameConflict) {
//                 return res.status(409).json({ error: true, message: 'Another college already has this name.' });
//             }
//             college.name = trimmedName;
//         }

//         if (code && code.trim()) {
//             const trimmedCode = code.trim().toUpperCase();
//             const codeConflict = await College.findOne({
//                 _id: { $ne: id },
//                 code: trimmedCode
//             });
//             if (codeConflict) {
//                 return res.status(409).json({ error: true, message: 'Another college already has this code.' });
//             }
//             college.code = trimmedCode;
//         }

//         if (address !== undefined) college.address = address.trim();
//         if (city !== undefined) college.city = city.trim();
//         if (state !== undefined) college.state = state.trim();
//         if (Array.isArray(adminIds)) college.adminIds = adminIds;
//         if (typeof isActive === 'boolean') college.isActive = isActive;

//         await college.save();

//         return res.json({
//             error: false,
//             message: 'College updated successfully.',
//             college
//         });
//     } catch (err) {
//         console.error('Error updating college:', err);
//         return res.status(500).json({ error: true, message: 'Server error updating college', details: err.message });
//     }
// };

/**
 * DELETE /admin/colleges/:id
 * Delete a college. Checks if any teachers/users belong to it first.
 */
// const deleteCollege = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const college = await College.findById(id);
//         if (!college) {
//             return res.status(404).json({ error: true, message: 'College not found.' });
//         }

//         const userCount = await User.countDocuments({ collegeId: id });
//         if (userCount > 0) {
//             return res.status(400).json({
//                 error: true,
//                 message: `Cannot delete college. There are currently ${userCount} users assigned to it. Deactivate the college instead or reassign users.`
//             });
//         }

//         await College.findByIdAndDelete(id);

//         return res.json({
//             error: false,
//             message: 'College deleted successfully.'
//         });
//     } catch (err) {
//         console.error('Error deleting college:', err);
//         return res.status(500).json({ error: true, message: 'Server error deleting college', details: err.message });
//     }
// };

/**
 * GET /colleges/active  (or /auth/colleges)
 * Public / helper route returning all active colleges for user registration dropdown.
 */
const getActiveColleges = async (req, res) => {
    try {
        const colleges = await College.find({ isActive: true })
            .select('_id name code city state')
            .sort({ name: 1 })
            .lean();

        return res.json({
            error: false,
            colleges
        });
    } catch (err) {
        console.error('Error fetching active colleges:', err);
        return res.status(500).json({ error: true, message: 'Error fetching active colleges.' });
    }
};

module.exports = {
    getActiveColleges
};
