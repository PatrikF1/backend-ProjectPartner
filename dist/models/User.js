import mongoose, { Schema } from 'mongoose';
const UserSchema = new Schema({
    ime: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    godine: {
        type: Number,
        min: 0
    }
}, {
    timestamps: true
});
export default mongoose.model('User', UserSchema);
//# sourceMappingURL=User.js.map