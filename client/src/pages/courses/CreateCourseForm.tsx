import { useEffect } from "react";
import { useUserStore } from "../../store/userStore";
import { Button, Form, Input, Modal } from "antd";
import { useFormik } from "formik";
import * as Yup from "yup";

interface CreateCourseFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (values: any) => void;
}

export const CreateCourseForm = ({ open, onClose, onSubmit }: CreateCourseFormProps) => {
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
            .matches(/^[^!@$%^&*?{}|<>]*$/, "El nombre no puede contener caracteres especiales")
            .matches(/^(?=.*[a-zA-Z]).*$/, "El nombre debe contener al menos una letra")
    })

    const formik = useFormik({
        enableReinitialize: false,
        initialValues: {
            name: ""
        },
        validationSchema,
        onSubmit: (values, { resetForm }) => {
            onSubmit(values);
            resetForm();
            onClose();
        },
    });

    const handleCancel = () => {
        onClose();
    }

    const handleSubmit = () => {
        formik.handleSubmit()
    }

    return (
        <Modal
            open={open}
            onCancel={handleCancel}
            footer={[
                <Button key="cancel" danger onClick={onClose}>
                    Cancelar
                </Button>,
                <Button type="primary" onClick={handleSubmit}>
                    Registrar materia
                </Button>
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
                    validateStatus={
                        formik.errors.name && formik.touched.name ? "error" : ""
                    }
                    help={formik.touched.name && formik.errors.name}
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
    )
}
