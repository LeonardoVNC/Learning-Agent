import { Modal, Form, Input, Button } from 'antd';
import { useFormik } from 'formik';
import * as Yup from 'yup';


interface UploadStudentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: { studentName: string; studentLastname: string; studentCode: string }) => void;
}

export const SingleStudentForm = ({ open, onClose, onSubmit }: UploadStudentFormProps
) => {
  const validationSchema = Yup.object().shape({
    studentName: Yup.string()
      .required('Nombre requerido')
      .matches(/^[^!@$%^&*?{}|<>]*$/, "El nombre no puede contener caracteres especiales")
      .matches(/^[^0-9]*$/, "El nombre no puede contener números")
      .max(30, "El nombre no puede tener más de 30 caracteres"),
    studentLastname: Yup.string()
      .required('Apellido requerido')
      .matches(/^[^!@$%^&*?{}|<>]*$/, "El apellido no puede contener caracteres especiales")
      .matches(/^[^0-9]*$/, "El apellido no puede contener números")
      .max(30, "El apellido no puede tener más de 30 caracteres"),
    studentCode: Yup.string()
      .required('Código de estudiante requerido')
      .matches(/^[^!@$%^&*?{}|<>]*$/, "El código no puede contener caracteres especiales")
      .max(8, "El código no puede tener más de 8 dígitos")
  });

  const formik = useFormik({
    initialValues: {
      studentName: '',
      studentLastname: '',
      studentCode: '',
    },
    validationSchema,
    onSubmit: (values, { resetForm }) => {
      onSubmit(values);
      resetForm();
      onClose();
    }
  });

  const handleCancel = () => {
    formik.resetForm();
    onClose();
  }

  const handleSubmit = () => {
    formik.handleSubmit()
  }

  return (
    <Modal open={open} onCancel={handleCancel} onOk={() => { }}
      footer={[
        <Button key="cancel" danger onClick={handleCancel}>
          Cancelar
        </Button>,
        <Button type="primary" onClick={handleSubmit}>
          Inscribir estudiante
        </Button>
      ]}
      centered title="Añadir Estudiante">
      <Form layout="vertical" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Form.Item
          style={{ width: '100%' }}
          label="Nombre"
          validateStatus={formik.errors.studentName && formik.touched.studentName ? 'error' : ''}
          help={formik.touched.studentName && formik.errors.studentName}
        >
          <Input name="studentName" value={formik.values.studentName} onChange={formik.handleChange} onBlur={formik.handleBlur} />
        </Form.Item>
        <Form.Item
          style={{ width: '100%' }}
          label="Apellido"
          validateStatus={formik.errors.studentLastname && formik.touched.studentLastname ? 'error' : ''}
          help={formik.touched.studentLastname && formik.errors.studentLastname}>
          <Input name="studentLastname" value={formik.values.studentLastname} onChange={formik.handleChange} onBlur={formik.handleBlur} />
        </Form.Item>
        <Form.Item
          style={{ width: '100%' }}
          label="Código UPB"
          validateStatus={formik.errors.studentCode && formik.touched.studentCode ? 'error' : ''}
          help={formik.touched.studentCode && formik.errors.studentCode}>
          <Input name="studentCode" value={formik.values.studentCode} onChange={formik.handleChange} onBlur={formik.handleBlur} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
