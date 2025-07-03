// src/forms.js
import gad7 from './forms/gad7.json';
import phq9 from './forms/phq9.json';
import srs2_adult_self from './forms/srs2_adult_self.json';
import srs2_adult_informant from './forms/srs2_adult_informant.json'


const forms = {
  gad7,
  phq9,
  'SRS-2 Adult (Self)': srs2_adult_self,
  'SRS-2 Adult (Informant)': srs2_adult_informant
};

export default forms;  // <--- default export
