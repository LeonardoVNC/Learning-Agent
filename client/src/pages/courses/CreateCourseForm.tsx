import { useEffect } from "react";
import { Button, Form, Input, Modal } from "antd";
import { useFormik } from "formik";
import * as Yup from "yup";
import type { CreateCourseDTO } from "../../interfaces/courseInterface";
import { useUserStore } from "../../store/userStore";

interface CreateCourseFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CreateCourseDTO) => void;
}

export const CreateCourseForm = ({
  open,
  onClose,
  onSubmit,
}: CreateCourseFormProps) => {
  const user = useUserStore((s) => s.user);
  const fetchUser = useUserStore((s) => s.fetchUser);

  useEffect(() => {
    if (!user || user === null) {
      fetchUser();
    }
  }, [open]);

  const validationSchema = Yup.object().shape({
    name: Yup.string()
      .required("Nombre requerido")
      .max(40, "El nombre no puede tener más de 40 caracteres")
      .matches(
        /^[^!@$%^&*?{}|<>]*$/,
        "El nombre no puede contener caracteres especiales"
      )
      .matches(
        /^(?=.*[a-zA-Z]).*$/,
        "El nombre debe contener al menos una letra"
      ),
  });

  const formik = useFormik({
    enableReinitialize: false,
    initialValues: {
      name: "",
    },
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: (values, { resetForm }) => {
      onSubmit(values);
      resetForm();
      onClose();
    },
  });

  const handleCancel = () => {
    formik.resetForm();
    onClose();
  };

  const handleSubmit = () => {
    formik.handleSubmit();
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" danger type="primary" onClick={handleCancel}>
          Cancelar
        </Button>,
        <Button type="primary" onClick={handleSubmit}>
          Registrar materia
        </Button>,
      ]}
      centered
      title="Registrar una nueva materia"
    >
      <Form
        layout="vertical"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
        onFinish={formik.handleSubmit}
      >
        <Form.Item
          style={{ width: "100%" }}
          label="Nombre de la materia"
          validateStatus={formik.errors.name ? "error" : ""}
          help={formik.errors.name}
        >
          <Input
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
