import { useState } from "react";
import { User, Calendar, MapPin, GraduationCap, Home, FileText, AlertCircle, HelpCircle } from "lucide-react";

const FormField = ({ 
  label, 
  name, 
  type = "text", 
  placeholder, 
  options, 
  onHelpClick, 
  isActive,
  required = true,
  icon: Icon,
  helpText
}) => {
  const baseInputClass = `w-full rounded-sm border bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 
    focus:outline-none focus:ring-2 focus:ring-[#3498db]/20 focus:border-[#3498db] 
    font-ibm-plex transition-colors duration-200`;
  
  const activeClass = isActive 
    ? "border-[#3498db] ring-2 ring-[#3498db]/20 bg-blue-50/30" 
    : "border-slate-300 hover:border-slate-400";

  const handleHelpClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onHelpClick(label, type === "select" ? "select" : "input");
  };

  return (
    <div className="mb-5" data-testid={`form-field-${name}`}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          {label}
          {required && <span className="text-[#d35400]">*</span>}
        </label>
        <button
          type="button"
          onClick={handleHelpClick}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
            isActive 
              ? 'bg-[#3498db] text-white shadow-sm' 
              : 'bg-slate-100 text-slate-600 hover:bg-[#3498db]/10 hover:text-[#3498db]'
          }`}
          data-testid={`help-btn-${name}`}
        >
          <HelpCircle className="w-3 h-3" />
          <span>Need Help?</span>
        </button>
      </div>
      {helpText && (
        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {helpText}
        </p>
      )}
      {type === "select" ? (
        <select
          name={name}
          className={`${baseInputClass} ${activeClass} cursor-pointer`}
          data-testid={`select-${name}`}
        >
          <option value="">Select an option...</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          placeholder={placeholder}
          rows={3}
          className={`${baseInputClass} ${activeClass} resize-none`}
          data-testid={`textarea-${name}`}
        />
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          className={`${baseInputClass} ${activeClass}`}
          data-testid={`input-${name}`}
        />
      )}
    </div>
  );
};

const SectionHeader = ({ title, subtitle, icon: Icon }) => (
  <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-200">
    <div className="bg-[#2c3e50] p-2 rounded-lg">
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <h3 className="text-base font-bold text-[#2c3e50]">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
  </div>
);

const PassportForm = ({ onHelpClick, activeField }) => {
  const ecnrOptions = [
    { value: "ecr", label: "ECR - Emigration Check Required" },
    { value: "ecnr", label: "ECNR - Emigration Check Not Required" }
  ];

  const genderOptions = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "transgender", label: "Transgender" }
  ];

  const maritalOptions = [
    { value: "single", label: "Single / Unmarried" },
    { value: "married", label: "Married" },
    { value: "divorced", label: "Divorced" },
    { value: "widowed", label: "Widow / Widower" },
    { value: "separated", label: "Separated" }
  ];

  const educationOptions = [
    { value: "below_10th", label: "Below 10th Standard" },
    { value: "10th", label: "10th Pass" },
    { value: "12th", label: "12th Pass / Higher Secondary" },
    { value: "graduate", label: "Graduate" },
    { value: "post_graduate", label: "Post Graduate" },
    { value: "professional", label: "Professional Degree (Medical, Engineering, etc.)" }
  ];

  const employmentOptions = [
    { value: "government", label: "Government Employee" },
    { value: "psu", label: "PSU Employee" },
    { value: "statutory_body", label: "Statutory Body Employee" },
    { value: "private", label: "Private Sector Employee" },
    { value: "self_employed", label: "Self Employed / Business" },
    { value: "homemaker", label: "Homemaker" },
    { value: "student", label: "Student" },
    { value: "retired", label: "Retired" },
    { value: "others", label: "Others" }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" data-testid="passport-form">
      {/* Form Header */}
      <div className="bg-gradient-to-r from-[#2c3e50] to-[#34495e] px-6 py-5">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-white/90" />
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Passport Application Form</h2>
            <p className="text-sm text-white/70">Sample form based on Passport Seva portal</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Applicant Details Section */}
        <section className="mb-8" data-testid="section-applicant-details">
          <SectionHeader 
            title="Applicant Details" 
            subtitle="Personal information as per official documents"
            icon={User}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <FormField
              label="Given Name (First & Middle Name)"
              name="given_name"
              placeholder="Enter your first and middle name"
              onHelpClick={onHelpClick}
              isActive={activeField === "Given Name (First & Middle Name)"}
              icon={User}
              helpText="As printed on existing documents"
            />
            <FormField
              label="Surname (Last Name)"
              name="surname"
              placeholder="Enter your surname"
              onHelpClick={onHelpClick}
              isActive={activeField === "Surname (Last Name)"}
            />
            <FormField
              label="Date of Birth"
              name="dob"
              type="date"
              onHelpClick={onHelpClick}
              isActive={activeField === "Date of Birth"}
              icon={Calendar}
            />
            <FormField
              label="Gender"
              name="gender"
              type="select"
              options={genderOptions}
              onHelpClick={onHelpClick}
              isActive={activeField === "Gender"}
            />
            <FormField
              label="Place of Birth (City/Town/Village)"
              name="birth_place"
              placeholder="Enter your place of birth"
              onHelpClick={onHelpClick}
              isActive={activeField === "Place of Birth (City/Town/Village)"}
              icon={MapPin}
            />
            <FormField
              label="Marital Status"
              name="marital_status"
              type="select"
              options={maritalOptions}
              onHelpClick={onHelpClick}
              isActive={activeField === "Marital Status"}
            />
          </div>
        </section>

        {/* Family Details Section */}
        <section className="mb-8" data-testid="section-family-details">
          <SectionHeader 
            title="Family Details" 
            subtitle="Parent/Guardian information"
            icon={User}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <FormField
              label="Father's Given Name"
              name="father_given_name"
              placeholder="Enter father's first name"
              onHelpClick={onHelpClick}
              isActive={activeField === "Father's Given Name"}
            />
            <FormField
              label="Father's Surname"
              name="father_surname"
              placeholder="Enter father's surname"
              onHelpClick={onHelpClick}
              isActive={activeField === "Father's Surname"}
            />
            <FormField
              label="Mother's Given Name"
              name="mother_given_name"
              placeholder="Enter mother's first name"
              onHelpClick={onHelpClick}
              isActive={activeField === "Mother's Given Name"}
            />
            <FormField
              label="Mother's Surname"
              name="mother_surname"
              placeholder="Enter mother's surname"
              onHelpClick={onHelpClick}
              isActive={activeField === "Mother's Surname"}
            />
          </div>
        </section>

        {/* Education & Employment Section */}
        <section className="mb-8" data-testid="section-education-employment">
          <SectionHeader 
            title="Education & Employment" 
            subtitle="Qualification and occupation details"
            icon={GraduationCap}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <FormField
              label="Educational Qualification"
              name="education"
              type="select"
              options={educationOptions}
              onHelpClick={onHelpClick}
              isActive={activeField === "Educational Qualification"}
              icon={GraduationCap}
            />
            <FormField
              label="Employment Type"
              name="employment"
              type="select"
              options={employmentOptions}
              onHelpClick={onHelpClick}
              isActive={activeField === "Employment Type"}
            />
            <FormField
              label="ECR / ECNR Status"
              name="ecr_status"
              type="select"
              options={ecnrOptions}
              onHelpClick={onHelpClick}
              isActive={activeField === "ECR / ECNR Status"}
              helpText="Important for international travel"
            />
          </div>
        </section>

        {/* Address Section */}
        <section className="mb-8" data-testid="section-address">
          <SectionHeader 
            title="Present Address" 
            subtitle="Current residential address"
            icon={Home}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <FormField
              label="House No. & Street Name"
              name="street"
              placeholder="Enter house number and street"
              onHelpClick={onHelpClick}
              isActive={activeField === "House No. & Street Name"}
              icon={Home}
            />
            <FormField
              label="Village / Town / City"
              name="city"
              placeholder="Enter city or town name"
              onHelpClick={onHelpClick}
              isActive={activeField === "Village / Town / City"}
            />
            <FormField
              label="District"
              name="district"
              placeholder="Enter district name"
              onHelpClick={onHelpClick}
              isActive={activeField === "District"}
            />
            <FormField
              label="State / Union Territory"
              name="state"
              placeholder="Enter state name"
              onHelpClick={onHelpClick}
              isActive={activeField === "State / Union Territory"}
            />
            <FormField
              label="PIN Code"
              name="pincode"
              placeholder="Enter 6-digit PIN code"
              onHelpClick={onHelpClick}
              isActive={activeField === "PIN Code"}
            />
            <FormField
              label="Mobile Number"
              name="mobile"
              type="tel"
              placeholder="Enter 10-digit mobile number"
              onHelpClick={onHelpClick}
              isActive={activeField === "Mobile Number"}
            />
          </div>
        </section>

        {/* Emergency Contact */}
        <section data-testid="section-emergency">
          <SectionHeader 
            title="Emergency Contact" 
            subtitle="Contact person in case of emergency"
            icon={User}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <FormField
              label="Emergency Contact Name"
              name="emergency_name"
              placeholder="Enter contact person's name"
              onHelpClick={onHelpClick}
              isActive={activeField === "Emergency Contact Name"}
            />
            <FormField
              label="Emergency Contact Mobile"
              name="emergency_mobile"
              type="tel"
              placeholder="Enter contact person's mobile"
              onHelpClick={onHelpClick}
              isActive={activeField === "Emergency Contact Mobile"}
            />
            <FormField
              label="Emergency Contact Address"
              name="emergency_address"
              type="textarea"
              placeholder="Enter complete address of emergency contact"
              onHelpClick={onHelpClick}
              isActive={activeField === "Emergency Contact Address"}
              required={false}
            />
          </div>
        </section>

        {/* Submit Button */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end gap-4">
          <button className="btn-secondary" data-testid="btn-save-draft">
            Save Draft
          </button>
          <button className="btn-primary" data-testid="btn-submit">
            Submit Application
          </button>
        </div>
      </div>
    </div>
  );
};

export default PassportForm;
