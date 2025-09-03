import { Modal, Form, DatePicker, Button, Select } from "antd";
import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type { Clase } from "../interfaces/claseInterface";
import { useUserStore } from "../store/userStore";

interface CreateClaseModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Clase) => void;
  clase?: Clase;
}

export const CursosForm = ({
  open,
  onClose,
  onSubmit,
  clase,
}: CreateClaseModalProps) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const user = useUserStore((s) => s.user);
  const fetchUser = useUserStore((s) => s.fetchUser);

  useEffect(() => {
    if (!user || user === null) {
      fetchUser();
    }
  }, [open]);

  const validationSchema = Yup.object().shape({
    name: Yup.string().required("Nombre requerido"),
    semester: Yup.string().required("Campo requerido"),
    dateBegin: Yup.date()
      .min(
        new Date(new Date().setDate(new Date().getDate() - 21)),
        "La fecha debe ser como máximo 3 semanas antes de hoy"
      )
      .required("Inicio requerido"),
    dateEnd: Yup.date()
      .test(
        "is-after-start",
        "El fin debe ser después del inicio",
        function (value) {
          const { dateBegin } = this.parent;
          if (!dateBegin || !value) return false;
          return new Date(value) > new Date(dateBegin);
        }
      )
      .required("Fin requerido"),
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: clase?.name || "",
      semester: clase?.semester || "",
      dateBegin: clase?.dateBegin || "",
      dateEnd: clase?.dateEnd || "",
    },
    validationSchema,
    onSubmit: (values, { resetForm }) => {
      onSubmit({
        ...values,
        teacherId: user?.id || "",
        id: clase?.id || "",
      });
      resetForm();
      onClose();
    },
  });

  const SEMESTER_TERMS = ["PRIMERO", "SEGUNDO", "VERANO", "INVIERNO"] as const;

  const yearForSemester = formik.values.dateBegin
    ? new Date(formik.values.dateBegin).getFullYear()
    : new Date().getFullYear();

  const semesterOptions = SEMESTER_TERMS.map((t) => ({
    label: `${t}${yearForSemester}`,
    value: `${t}${yearForSemester}`,
  }));

  const handleSubmit = () => {
    formik.handleSubmit()
  }

  const handleCancel = () => {
    formik.resetForm();
    onClose();
  }

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" danger onClick={handleCancel}>
          Cancelar
        </Button>,
        <Button type="primary" onClick={handleSubmit}>
          {clase ? "Guardar Cambios" : "Registrar curso"}
        </Button>
      ]}
      centered
      title={clase ? "Editar Curso" : "Añadir Curso"}
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
            formik.errors.dateBegin && formik.touched.dateBegin ? "error" : ""
          }
          help={formik.touched.dateBegin && formik.errors.dateBegin}
        >
          <DatePicker
            style={{ width: "100%" }}
            format="DD-MM-YYYY"
            value={
              formik.values.dateBegin
                ? dayjs(formik.values.dateBegin)
                : undefined
            }
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
                formik.setFieldValue("dateBegin", isoDate);

                const autoEnd = new Date(date);
                autoEnd.setDate(autoEnd.getDate() + 34);
                const autoEndISO = autoEnd.toISOString().split("T")[0];
                formik.setFieldValue("dateEnd", autoEndISO);

                const year = date.getFullYear();
                const match = formik.values.semester?.match(
                  /^(PRIMERO|SEGUNDO|VERANO|INVIERNO)\d{4}$/
                );
                if (match)
                  formik.setFieldValue("semester", `${match[1]}${year}`);
              }
            }}
          />
        </Form.Item>

        <Form.Item
          style={{ width: "100%" }}
          label="Fin de Módulo"
          validateStatus={
            formik.errors.dateEnd && formik.touched.dateEnd ? "error" : ""
          }
          help={formik.touched.dateEnd && formik.errors.dateEnd}
        >
          <DatePicker
            style={{ width: "100%" }}
            format="DD-MM-YYYY"
            disabledDate={(current: Dayjs) => {
              if (!startDate) return false;
              return current && current.toDate() <= startDate;
            }}
            value={
              formik.values.dateEnd ? dayjs(formik.values.dateEnd) : undefined
            }
            onChange={(value) => {
              const date = value?.toDate();
              formik.setFieldValue(
                "dateEnd",
                date?.toISOString().split("T")[0]
              );
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
