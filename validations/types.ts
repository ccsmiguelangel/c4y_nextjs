export interface StrapiImage {
  url: string;
  alternativeText: string;
}

export interface StrapiLink {
  href: string;
  isExternal: boolean;
  label: string;
}

export interface HeroSectionData {
  heading: string;
  sub_heading: string;
  image: StrapiImage;
  link: StrapiLink;
}

export interface StrapiPageMetadata {
  title: string;
  description: string;
  favicon?: StrapiImage;
}

export interface StrapiResponse<T = any> {
  data: T;
  meta?: Record<string, any>;
}

export interface HeaderSection {
  title: string;
  subtitle: string;
}

export interface SinginFormData {
  header: HeaderSection;
  email_label: string;
  email_placeholder: string;
  password_label: string;
  password_placeholder: string;
  submit_button: string;
  singup_previous_link_text: string;
  singup_link: StrapiLink[];
}

export interface SinginData {
  title: string;
  description: string;
  header: {
    title: string;
    description: string;
    favicon?: StrapiImage;
  };
  sections: Array<{
    __component: string;
  } & SinginFormData>;
}

export interface SinginDataProcessed {
  title: string;
  description: string;
  header: {
    title: string;
    description: string;
    favicon?: StrapiImage;
  };
  singinForm: SinginFormData;
}

export interface SingupFormData {
  header: HeaderSection;
  username_label: string;
  username_placeholder: string;
  email_label: string;
  email_placeholder: string;
  password_label: string;
  password_placeholder: string;
  submit_buton: string;
  singin_previous_link_text: string;
  singin_link: StrapiLink[];
}

export interface SingupData {
  Title: string;
  Description: string;
  header: Array<{
    title: string;
    description: string;
    favicon?: StrapiImage;
  }>;
  sections: Array<{
    __component: string;
  } & SingupFormData>;
}

export interface SingupDataProcessed {
  title: string;
  description: string;
  header: {
    title: string;
    description: string;
    favicon?: StrapiImage;
  };
  singupForm: SingupFormData;
}

export interface DashboardData {
  title: string;
  description: string;
  favicon?: StrapiImage;
  sections: Array<{
    __component: string;
  } & HeroSectionData>;
}

export interface DashboardDataProcessed {
  title: string;
  description: string;
  favicon?: StrapiImage;
  sections: HeroSectionData[];
}

