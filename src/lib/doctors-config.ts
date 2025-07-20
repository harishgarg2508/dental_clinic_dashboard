export interface Doctor {
  id: string
  name: string
  qualification: string
  mobile: string[]
  email: string
  address: string
  isDefault?: boolean
}

export const doctors: Doctor[] = [
  {
    id: "dr-suraj-sharma",
    name: "Dr. Suraj Sharma,Dr. Karuna Sharma",
    qualification: "BDS, MIDA",
    mobile: ["75085 74656", "89682 88817"],
    email: "sunrisedental817@gmail.com",
    address: "Gali No 7, Near Shishu Niketan School, Nayagaon, Chandigarh, Punjab 160103",
    isDefault: true,
  },
  // Add more doctors here as needed
  // {
  //   id: "dr-example",
  //   name: "Dr. Example Name",
  //   qualification: "BDS, MDS",
  //   mobile: ["+91 98765 43210"],
  //   email: "example@clinic.com",
  //   address: "Example Address",
  //   isDefault: false,
  // },
]

export const getDefaultDoctor = (): Doctor => {
  return doctors.find((doctor) => doctor.isDefault) || doctors[0]
}

export const getDoctorById = (id: string): Doctor | undefined => {
  return doctors.find((doctor) => doctor.id === id)
}

export const getAllDoctors = (): Doctor[] => {
  return doctors
}

// Clinic information
export const clinicInfo = {
  name: "Sunrise Dental Clinic",
  tagline: "Your Smile, Our Priority",
  website: "www.sunrisedental.com",
  // You can add more clinic-wide information here
}
