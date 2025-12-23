import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Loader2, Save, X } from 'lucide-react';
import { uploadProfilePicture } from '../../services/userApi';

const ProfileForm = ({ user, onSave, isLoading }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    bio: user?.bio || '',
    phoneNumber: user?.phoneNumber || '',
    profilePicture: user?.profilePicture || '',
  });
  const [imagePreview, setImagePreview] = useState(user?.profilePicture || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const base64 = await uploadProfilePicture(file);
      setImagePreview(base64);
      setFormData((prev) => ({ ...prev, profilePicture: base64 }));
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleReset = () => {
    setFormData({
      fullName: user?.fullName || '',
      bio: user?.bio || '',
      phoneNumber: user?.phoneNumber || '',
      profilePicture: user?.profilePicture || '',
    });
    setImagePreview(user?.profilePicture || '');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Picture */}
      <div className="flex flex-col items-center">
        <div className="relative group">
          <div
            onClick={handleImageClick}
            className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 cursor-pointer border-4 border-white shadow-lg"
          >
            {uploadingImage ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <Loader2 className="w-8 h-8 animate-spin text-[#208896]" />
              </div>
            ) : imagePreview ? (
              <img
                src={imagePreview}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#208896] to-[#1a6d78] text-white text-4xl font-bold">
                {formData.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleImageClick}
            className="absolute bottom-0 right-0 p-2 bg-[#208896] text-white rounded-full shadow-lg hover:bg-[#1a6d78] transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        <p className="text-sm text-gray-500 mt-2">{t('profile.form.clickToChangePhoto')}</p>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('profile.form.fullName')}
        </label>
        <input
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208896] focus:border-transparent transition-all"
          placeholder={t('profile.form.fullName')}
          required
        />
      </div>

      {/* Email (Read-only) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('profile.form.email')}
        </label>
        <input
          type="email"
          value={user?.email || ''}
          disabled
          className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
        />
        <p className="text-xs text-gray-400 mt-1">{t('profile.form.emailCannotBeChanged')}</p>
      </div>

      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('profile.form.phoneNumber')}
        </label>
        <input
          type="tel"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208896] focus:border-transparent transition-all"
          placeholder={t('profile.form.phonePlaceholder')}
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('profile.form.bio')}
        </label>
        <textarea
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          rows={4}
          maxLength={500}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208896] focus:border-transparent transition-all resize-none"
          placeholder={t('profile.form.bioPlaceholder')}
        />
        <p className="text-xs text-gray-400 text-right">
          {formData.bio.length}/500
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          {t('profile.form.reset')}
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-[#208896] text-white rounded-lg hover:bg-[#1a6d78] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isLoading ? t('profile.form.saving') : t('profile.form.saveChanges')}
        </button>
      </div>
    </form>
  );
};

export default ProfileForm;
