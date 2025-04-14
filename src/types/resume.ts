export interface PersonalInfo {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  about: string;
  avatar: string;
  gender?: string;
}

export interface WorkExperience {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  description: string;
}

export interface Education {
  institution: string;
  degree: string;
  startDate: string;
  endDate?: string;
  description: string;
}

export interface Relationship {
  person: string;
  type: string;
  startDate: string;
  endDate?: string;
  story: string;
}

export interface PersonalExperience {
  title: string;
  date: string;
  description: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  title: string;
  description: string;
}

export interface Skill {
  name: string;
  level: number;
}

export interface ResumeData {
  id?: string;
  personalInfo: PersonalInfo;
  workExperience: WorkExperience[];
  education: Education[];
  relationships: Relationship[];
  personalExperience: PersonalExperience[];
  galleryImages: GalleryImage[];
  skills: Skill[];
} 