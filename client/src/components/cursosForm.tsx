import { Modal, Form, Input, DatePicker, Button, Select } from "antd";
import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

interface CreateClaseModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: {
    Name: string;
    start_date: string;
    end_date: string;
    semester: string;
  }) => void;
}

export const CursosForm = ({
  open,
  onClose,
  onSubmit,
}: CreateClaseModalProps) => {
  const [startDate, setStartDate] = useState<Date | null>(null);

  const validationSchema = Yup.object().shape({
    Name: Yup.string().required("Nombre requerido"),
    semester: Yup.string().required("Campo requerido"),
    start_date: Yup.date()
      .min(
        new Date(new Date().setDate(new Date().getDate() - 21)),
        "La fecha debe ser como máximo 3 semanas antes de hoy"
      )
      .required("Inicio requerido"),
    end_date: Yup.date()
      .test(
        "is-after-start",
        "El fin debe ser después del inicio",
        function (value) {
          const { start_date } = this.parent;
          if (!start_date || !value) return false;
          return new Date(value) > new Date(start_date);
        }
      )
      .required("Fin requerido"),
  });

  const formik = useFormik({
    initialValues: {
      id: "",
      Name: "",
      semester: "",
      start_date: "",
      end_date: "",
    },
    validationSchema,
    onSubmit: (values, { resetForm }) => {
      onSubmit(values);
      resetForm();
      onClose();
    },
  });

  const SEMESTER_TERMS = ["PRIMERO", "SEGUNDO", "VERANO", "INVIERNO"] as const;

  const yearForSemester = formik.values.start_date
    ? new Date(formik.values.start_date).getFullYear()
    : new Date().getFullYear();

  const semesterOptions = SEMESTER_TERMS.map((t) => ({
    label: `${t}${yearForSemester}`,
    value: `${t}${yearForSemester}`,
  }));

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={() => {}}
      footer={null}
      centered
      title={
        <div style={{ textAlign: "center", width: "100%" }}>Añadir Curso</div>
      }
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
          label="Nombre"
          validateStatus={
            formik.errors.Name && formik.touched.Name ? "error" : ""
          }
          help={formik.touched.Name && formik.errors.Name}
        >
          <Input
            name="Name"
            value={formik.values.Name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
        </Form.Item>

        <Form.Item
          style={{ width: "100%" }}
          label="Semestre"
          validateStatus={
            formik.errors.semester && formik.touched.semester ? "error" : ""
          }
          help={formik.touched.semester && formik.errors.semester}
        >
          <Select
            placeholder="Selecciona semestre"
            options={semesterOptions}
            value={formik.values.semester || undefined}
            onChange={(val) => formik.setFieldValue("semester", val)}
            onBlur={() => formik.setFieldTouched("semester", true)}
          />
        </Form.Item>

        <Form.Item
          style={{ width: "100%" }}
          label="Inicio de Módulo"
          validateStatus={
            formik.errors.start_date && formik.touched.start_date ? "error" : ""
          }
          help={formik.touched.start_date && formik.errors.start_date}
        >
          <DatePicker
            style={{ width: "100%" }}
            format="DD-MM-YYYY"
            disabledDate={(current: Dayjs) => {
              const threeWeeksAgo = new Date();
              threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
              return current && current.toDate() < threeWeeksAgo;
            }}
            onChange={(value) => {
              const date = value?.toDate();
              setStartDate(date || null);
              if (date) {
                const isoDate = date.toISOString().split("T")[0];
                formik.setFieldValue("start_date", isoDate);

                // Autocalcular end_date 34 días después
                const autoEnd = new Date(date);
                autoEnd.setDate(autoEnd.getDate() + 34);
                const autoEndISO = autoEnd.toISOString().split("T")[0];
                formik.setFieldValue("end_date", autoEndISO);

                const year = date.getFullYear();
                const match = formik.values.semester?.match(
                  /^(PRIMERO|SEGUNDO|VERANO|INVIERNO)\d{4}$/
                );
                if (match)
                  formik.setFieldValue("semester", `${match[1]}${year}`);
              } else {
                formik.setFieldValue("start_date", "");
                formik.setFieldValue("end_date", "");
              }
            }}
          />
        </Form.Item>

        <Form.Item
          style={{ width: "100%" }}
          label="Fin de Módulo"
          validateStatus={
            formik.errors.end_date && formik.touched.end_date ? "error" : ""
          }
          help={formik.touched.end_date && formik.errors.end_date}
        >
          <DatePicker
            style={{ width: "100%" }}
            format="DD-MM-YYYY"
            disabledDate={(current: Dayjs) => {
              if (!startDate) return false;
              return current && current.toDate() <= startDate;
            }}
            value={
              formik.values.end_date ? dayjs(formik.values.end_date) : undefined
            }
            onChange={(value) => {
              const date = value?.toDate();
              formik.setFieldValue(
                "end_date",
                date?.toISOString().split("T")[0]
              );
            }}
          />
        </Form.Item>

        <Form.Item style={{ width: "70%" }}>
          <Button type="primary" htmlType="submit" style={{ width: "100%" }}>
            Guardar
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};
